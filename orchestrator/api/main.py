from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import json
import uuid
from datetime import datetime
import subprocess
import sys
import os
import asyncio
from typing import List, Optional
from sqlmodel import Session, select
from pydantic import BaseModel

from .models import TestSpec, TestRun, CreateSpecRequest, UpdateSpecRequest, UpdateMetadataRequest, BulkRunRequest
from .models_db import TestRun as DBTestRun, SpecMetadata as DBSpecMetadata
from .db import init_db, get_session, engine
from . import dashboard, settings

BASE_DIR = Path(__file__).resolve().parent.parent.parent
SPECS_DIR = BASE_DIR / "specs"
RUNS_DIR = BASE_DIR / "runs"
METADATA_FILE = SPECS_DIR / "spec-metadata.json"

app = FastAPI(title="Playwright Agent API")

app.include_router(dashboard.router)
app.include_router(settings.router)
app.mount("/artifacts", StaticFiles(directory=RUNS_DIR), name="artifacts")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Limit concurrent test executions
EXECUTION_SEMAPHORE: Optional[asyncio.Semaphore] = None

def sync_data_from_files():
    """Sync existing file-based runs and metadata to DB on startup."""
    print("Syncing data from files to DB...")
    with Session(engine) as session:
        # 1. Sync Runs
        if RUNS_DIR.exists():
            for d in RUNS_DIR.iterdir():
                if not d.is_dir(): continue
                run_id = d.name
                
                # Check if exists
                if session.get(DBTestRun, run_id):
                    continue
                
                # Derive info
                plan_file = d / "plan.json"
                run_file = d / "run.json"
                status_file = d / "status.txt"
                execution_log = d / "execution.log"
                
                test_name = None
                steps_completed = 0
                total_steps = 0
                browser = "chromium"
                status = "unknown"
                
                # Try to get Plan info
                if plan_file.exists():
                    try:
                        plan_data = json.loads(plan_file.read_text())
                        test_name = plan_data.get("testName")
                        total_steps = len(plan_data.get("steps", []))
                        browser = plan_data.get("browser", "chromium")
                    except: pass
                
                # Determine Status & Progress
                if run_file.exists():
                    try:
                        run_data = json.loads(run_file.read_text())
                        status = run_data.get("finalState", "completed")
                        steps_completed = len(run_data.get("steps", []))
                    except:
                        status = "completed"
                elif status_file.exists():
                    status = status_file.read_text().strip()
                elif plan_file.exists() or execution_log.exists():
                    status = "failed" # Assume failed if incomplete and old
                
                # Spec Name from spec.md if available
                spec_name = "unknown"
                if (d / "spec.md").exists():
                    # We don't easily know the original filename, but we can try to guess or leave it generic
                    spec_name = "restored_run"
                    # Try to find which spec it matches? Too expensive.
                
                # Create DB Entry
                # We use file modification time as creation time approximate
                mtime = datetime.fromtimestamp(os.path.getmtime(d))
                
                run = DBTestRun(
                    id=run_id,
                    spec_name=spec_name,
                    status=status,
                    created_at=mtime,
                    test_name=test_name,
                    steps_completed=steps_completed,
                    total_steps=total_steps,
                    browser=browser
                )
                session.add(run)
                
        # 2. Sync Metadata
        if METADATA_FILE.exists():
            try:
                meta_dict = json.loads(METADATA_FILE.read_text())
                for spec_name, data in meta_dict.items():
                    if session.get(DBSpecMetadata, spec_name):
                        continue
                    
                    meta = DBSpecMetadata(
                        spec_name=spec_name,
                        tags_json=json.dumps(data.get("tags", [])),
                        description=data.get("description"),
                        author=data.get("author")
                    )
                    # lastModified
                    lm = data.get("lastModified")
                    if lm:
                        try:
                            meta.last_modified = datetime.fromisoformat(lm)
                        except: pass
                        
                    session.add(meta)
            except:
                pass
                
        session.commit()
    print("Sync complete.")

@app.on_event("startup")
async def startup_event():
    global EXECUTION_SEMAPHORE
    EXECUTION_SEMAPHORE = asyncio.Semaphore(2)
    
    # Initialize DB
    init_db()
    
    # Run Sync in background or immediate? Immediate is safer for consistency on first load
    sync_data_from_files()

@app.get("/health")
def health():
    return {"status": "ok"}

# ========= Specs =========

@app.get("/specs", response_model=List[TestSpec])
def list_specs():
    specs = []
    if SPECS_DIR.exists():
        for f in SPECS_DIR.glob("**/*.md"):
            specs.append(TestSpec(
                name=str(f.relative_to(SPECS_DIR)),
                path=str(f.absolute()),
                content=f.read_text()
            ))
    return specs

@app.get("/specs/{name:path}")
def get_spec(name: str):
    f = SPECS_DIR / name
    if not f.exists():
        raise HTTPException(status_code=404, detail="Spec not found")
    return TestSpec(
        name=str(f.relative_to(SPECS_DIR)),
        path=str(f.absolute()),
        content=f.read_text()
    )

@app.post("/specs")
def create_spec(request: CreateSpecRequest):
    name = request.name
    if not name.endswith(".md"):
        name += ".md"
    f = SPECS_DIR / name
    if f.exists():
        raise HTTPException(status_code=400, detail="Spec already exists")
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(request.content)
    return {"status": "created", "path": str(f.absolute())}

@app.put("/specs/{name:path}")
def update_spec(name: str, request: UpdateSpecRequest):
    f = SPECS_DIR / name
    if not f.exists():
        raise HTTPException(status_code=404, detail="Spec not found")
    f.write_text(request.content)
    return {"status": "updated", "path": str(f.absolute())}

# ========= Runs =========

@app.get("/runs", response_model=List[TestRun])
def list_runs(session: Session = Depends(get_session)):
    # Fetch from DB
    statement = select(DBTestRun).order_by(DBTestRun.created_at.desc())
    runs_db = session.exec(statement).all()
    
    # Convert to API model
    results = []
    for r in runs_db:
        results.append(TestRun(
            id=r.id,
            timestamp=r.created_at.isoformat(), # Use created_at as timestamp
            status=r.status,
            test_name=r.test_name,
            steps_completed=r.steps_completed,
            total_steps=r.total_steps,
            browser=r.browser
        ))
    return results

@app.get("/runs/{id}")
def get_run(id: str, session: Session = Depends(get_session)):
    run_db = session.get(DBTestRun, id)
    # If not in DB, it might be a very old run or filesystem issue, but we sync on startup.
    # So we trust DB for existence.
    if not run_db:
        raise HTTPException(status_code=404, detail="Run not found")
        
    run_dir = RUNS_DIR / id
    # If directory is missing, we only have DB info
    if not run_dir.exists():
        return {"id": id, "status": run_db.status, "note": "Files missing"}

    # Load file details
    plan_file = run_dir / "plan.json"
    run_file = run_dir / "run.json"
    export_file = run_dir / "export.json"
    validation_file = run_dir / "validation.json"
    
    data = {"id": id}
    if plan_file.exists():
        data["plan"] = json.loads(plan_file.read_text())
    if run_file.exists():
        data["run"] = json.loads(run_file.read_text())
    if export_file.exists():
        export_data = json.loads(export_file.read_text())
        data["export"] = export_data
        test_path_str = export_data.get("testFilePath")
        if test_path_str:
            test_path = BASE_DIR / test_path_str
            if test_path.exists():
                data["generated_code"] = test_path.read_text()
            else:
                test_path = run_dir / test_path_str
                if test_path.exists():
                    data["generated_code"] = test_path.read_text()
    if validation_file.exists():
        data["validation"] = json.loads(validation_file.read_text())
    
    execution_log = run_dir / "execution.log"
    if execution_log.exists():
        data["log"] = execution_log.read_text()
        
    artifacts = []
    for f in run_dir.glob("**/*"):
        if f.is_file() and f.suffix.lower() in [".png", ".jpg", ".jpeg", ".webm", ".mp4"]:
            try:
                rel_path = f.relative_to(RUNS_DIR)
                artifacts.append({
                    "name": f.name,
                    "path": f"/artifacts/{rel_path}",
                    "type": "image" if f.suffix.lower() in [".png", ".jpg", ".jpeg"] else "video"
                })
            except ValueError: continue
    data["artifacts"] = artifacts
    
    report_index = run_dir / "report" / "index.html"
    if report_index.exists():
        data["report_url"] = f"/artifacts/{id}/report/index.html"
        
    return data

# ========= Execution Logic =========

def execute_run_task(spec_path: str, run_dir: str, try_code_path: str = None, browser: str = "chromium"):
    cmd = [sys.executable, "orchestrator/cli.py", spec_path, "--run-dir", run_dir, "--browser", browser]
    if try_code_path:
        cmd.extend(["--try-code", try_code_path])
    
    log_file = Path(run_dir) / "execution.log"
    with open(log_file, "w") as f:
        subprocess.run(cmd, cwd=BASE_DIR, stdout=f, stderr=subprocess.STDOUT)

async def execute_run_task_wrapper(spec_path: str, run_dir: str, run_id: str, try_code_path: str = None, browser: str = "chromium"):
    global EXECUTION_SEMAPHORE
    if EXECUTION_SEMAPHORE is None:
        EXECUTION_SEMAPHORE = asyncio.Semaphore(2)
        
    async with EXECUTION_SEMAPHORE:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, execute_run_task, spec_path, run_dir, try_code_path, browser)
        
        # Update DB Status
        with Session(engine) as session:
            run = session.get(DBTestRun, run_id)
            if run:
                status_file = Path(run_dir) / "status.txt"
                if status_file.exists():
                    run.status = status_file.read_text().strip()
                
                run_file = Path(run_dir) / "run.json"
                if run_file.exists():
                    try:
                        run_data = json.loads(run_file.read_text())
                        run.status = run_data.get("finalState", run.status)
                        run.steps_completed = len(run_data.get("steps", []))
                    except: pass
                
                plan_file = Path(run_dir) / "plan.json"
                if plan_file.exists():
                     try:
                        plan_data = json.loads(plan_file.read_text())
                        run.test_name = plan_data.get("testName", run.test_name)
                        run.total_steps = len(plan_data.get("steps", []))
                     except: pass

                session.add(run)
                session.commit()

class RunRequest(BaseModel):
    spec_name: str
    browser: Optional[str] = "chromium"

def get_try_code_path(spec_name: str, spec_path: Path) -> Optional[str]:
    # ... Same logic as before ...
    # Simplified for brevity:
    try_code_path = None
    spec_test_name = None
    if spec_path.exists():
         content = spec_path.read_text()
         for line in content.split("\n"):
             if line.startswith("# "):
                 spec_test_name = line.replace("# ", "").replace("Test:", "").strip()
                 break
    
    # 1. Search previous runs (File based search is still valid or we could search DB)
    # Using filesystem for code discovery is fine
    if RUNS_DIR.exists():
        run_dirs = sorted([d for d in RUNS_DIR.iterdir() if d.is_dir()], 
                         key=lambda x: os.path.getmtime(x), reverse=True)
        for r_dir in run_dirs:
            # ... identical logic to original ...
            plan_file = r_dir / "plan.json"
            export_file = r_dir / "export.json"
            if plan_file.exists() and export_file.exists():
                try:
                    plan = json.loads(plan_file.read_text())
                    match = False
                    if plan.get("specFileName") == spec_name: match = True
                    elif spec_test_name and plan.get("testName"):
                        t1 = plan.get("testName").lower().strip()
                        t2 = spec_test_name.lower().strip()
                        if t1 == t2 or t1 in t2 or t2 in t1: match = True
                    if match:
                         export = json.loads(export_file.read_text())
                         path_str = export.get("testFilePath")
                         if path_str:
                             candidate = BASE_DIR / path_str
                             if not candidate.exists(): candidate = r_dir / path_str
                             if candidate.exists(): 
                                 try_code_path = str(candidate)
                                 break
                except: pass
            if try_code_path: break
            
    if not try_code_path:
        stem = spec_path.stem
        candidates = [f"tests/generated/{stem}.spec.ts", f"tests/generated/{stem.replace('_', '-')}.spec.ts", f"tests/{stem}.spec.ts"]
        for c in candidates:
            if (BASE_DIR / c).exists():
                try_code_path = str(BASE_DIR / c)
                break
    return try_code_path

@app.post("/runs")
def create_run(request: RunRequest, background_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    spec_path = SPECS_DIR / request.spec_name
    if not spec_path.exists():
        raise HTTPException(status_code=404, detail="Spec not found")
        
    run_id = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    run_dir = RUNS_DIR / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "spec.md").write_text(spec_path.read_text())
    (run_dir / "status.txt").write_text("pending")
    
    try_code_path = get_try_code_path(request.spec_name, spec_path)
    
    # Create DB Entry
    run = DBTestRun(
        id=run_id,
        spec_name=request.spec_name,
        status="pending",
        browser=request.browser or "chromium"
    )
    session.add(run)
    session.commit()
    
    background_tasks.add_task(execute_run_task_wrapper, str(spec_path), str(run_dir), run_id, try_code_path, request.browser)
    return {"id": run_id, "status": "started"}

@app.post("/runs/bulk")
def create_bulk_run(request: BulkRunRequest, background_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    run_ids = []
    
    for spec_name in request.spec_names:
        spec_path = SPECS_DIR / spec_name
        if not spec_path.exists(): continue
            
        run_id = datetime.now().strftime("%Y-%m-%d_%H-%M-%S") + f"_{spec_name.replace('/', '_')}"
        run_dir = RUNS_DIR / run_id
        run_dir.mkdir(parents=True, exist_ok=True)
        (run_dir / "spec.md").write_text(spec_path.read_text())
        (run_dir / "status.txt").write_text("pending")
        
        try_code_path = get_try_code_path(spec_name, spec_path)
        
        run = DBTestRun(
            id=run_id,
            spec_name=spec_name,
            status="pending",
            browser=request.browser
        )
        session.add(run)
        
        background_tasks.add_task(execute_run_task_wrapper, str(spec_path), str(run_dir), run_id, try_code_path, request.browser)
        run_ids.append(run_id)
        
    session.commit()
    return {"run_ids": run_ids, "count": len(run_ids)}

# ========= Metadata =========

@app.get("/spec-metadata")
def get_all_metadata(session: Session = Depends(get_session)):
    metas = session.exec(select(DBSpecMetadata)).all()
    # Convert list to dict keyed by spec_name to match original API
    result = {}
    for m in metas:
        result[m.spec_name] = {
            "tags": m.tags,
            "description": m.description,
            "author": m.author,
            "lastModified": m.last_modified.isoformat() if m.last_modified else None
        }
    return result

@app.get("/spec-metadata/{spec_name:path}")
def get_spec_metadata(spec_name: str, session: Session = Depends(get_session)):
    m = session.get(DBSpecMetadata, spec_name)
    if not m:
        return {"tags": [], "description": None, "author": None, "lastModified": None}
    return {
        "tags": m.tags,
        "description": m.description,
        "author": m.author,
        "lastModified": m.last_modified.isoformat() if m.last_modified else None
    }

@app.put("/spec-metadata/{spec_name:path}")
def update_spec_metadata(spec_name: str, request: UpdateMetadataRequest, session: Session = Depends(get_session)):
    m = session.get(DBSpecMetadata, spec_name)
    if not m:
        m = DBSpecMetadata(spec_name=spec_name)
        
    if request.tags is not None:
        m.tags = request.tags
    if request.description is not None:
        m.description = request.description
    if request.author is not None:
        m.author = request.author
    
    m.last_modified = datetime.utcnow()
    
    session.add(m)
    session.commit()
    session.refresh(m)
    
    return {"status": "success", "metadata": {
        "tags": m.tags,
        "description": m.description,
        "author": m.author,
        "lastModified": m.last_modified.isoformat()
    }}
