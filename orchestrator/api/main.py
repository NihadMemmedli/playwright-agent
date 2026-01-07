from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import json
import uuid
from datetime import datetime
import subprocess
import sys
import os
from typing import List, Optional
from pydantic import BaseModel
from .models import TestSpec, TestRun, CreateSpecRequest, UpdateSpecRequest, SpecMetadata, UpdateMetadataRequest, BulkRunRequest
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

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/specs", response_model=List[TestSpec])
def list_specs():
    specs = []
    if SPECS_DIR.exists():
        # Recursive glob to find all markdown files
        for f in SPECS_DIR.glob("**/*.md"):
            specs.append(TestSpec(
                name=str(f.relative_to(SPECS_DIR)), # Return relative path e.g. "auth/login.md"
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
    # Ensure name ends with .md
    name = request.name
    if not name.endswith(".md"):
        name += ".md"
    
    f = SPECS_DIR / name
    if f.exists():
        raise HTTPException(status_code=400, detail="Spec already exists")
    
    # Ensure parent directory exists
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

@app.get("/runs", response_model=List[TestRun])
def list_runs():
    runs = []
    if RUNS_DIR.exists():
        # Get all subdirectories
        run_dirs = [d for d in RUNS_DIR.iterdir() if d.is_dir()]
        
        # Sort by modification time (latest first)
        run_dirs.sort(key=lambda x: os.path.getmtime(x), reverse=True)
        
        for d in run_dirs:
            status = "unknown"
            plan_file = d / "plan.json"
            run_file = d / "run.json"
            status_file = d / "status.txt"
            
            test_name = None
            steps_completed = 0
            total = 0
            browser = "chromium" # Default browser
            plan_data = {} # To store plan data if available
            
            # 1. Try to get Plan info
            if plan_file.exists():
                try:
                    plan_data = json.loads(plan_file.read_text())
                    test_name = plan_data.get("testName")
                    total = len(plan_data.get("steps", []))
                    browser = plan_data.get("browser", "chromium") # Read browser from plan
                except:
                    pass
            
            # 2. Determine Status & Progress
            if run_file.exists():
                try:
                    run_data = json.loads(run_file.read_text())
                    status = run_data.get("finalState", "completed")
                    # Count steps from the run trace
                    steps_completed = len(run_data.get("steps", []))
                except:
                    status = "completed"
            elif status_file.exists():
                status = status_file.read_text().strip()
            elif plan_file.exists():
                status = "in_progress"
            
            runs.append(TestRun(
                id=d.name,
                timestamp=d.name, 
                status=status,
                test_name=test_name,
                steps_completed=steps_completed,
                total_steps=total,
                browser=browser # Pass the determined browser
            ))

    return runs

@app.get("/runs/{id}")
def get_run(id: str):
    run_dir = RUNS_DIR / id
    if not run_dir.exists():
        raise HTTPException(status_code=404, detail="Run not found")
    
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
        
        # Read the generated test code
        test_path_str = export_data.get("testFilePath")
        if test_path_str:
            # Try to resolve path relative to BASE_DIR
            test_path = BASE_DIR / test_path_str
            if test_path.exists():
                data["generated_code"] = test_path.read_text()
            else:
                # Try relative to run dir (fallback)
                test_path = run_dir / test_path_str
                if test_path.exists():
                    data["generated_code"] = test_path.read_text()
                    
    if validation_file.exists():
        data["validation"] = json.loads(validation_file.read_text())
        
    execution_log = run_dir / "execution.log"
    if execution_log.exists():
        data["log"] = execution_log.read_text()
        
    # List artifacts
    artifacts = []
    if run_dir.exists():
        # Search for artifacts recursively
        for f in run_dir.glob("**/*"):
            if f.is_file() and f.suffix.lower() in [".png", ".jpg", ".jpeg", ".webm", ".mp4"]:
                try:
                    rel_path = f.relative_to(RUNS_DIR)
                    artifacts.append({
                        "name": f.name,
                        "path": f"/artifacts/{rel_path}",
                        "type": "image" if f.suffix.lower() in [".png", ".jpg", ".jpeg"] else "video"
                    })
                except ValueError:
                    continue
    data["artifacts"] = artifacts
    
    # Check for HTML Report
    report_index = run_dir / "report" / "index.html"
    if report_index.exists():
        data["report_url"] = f"/artifacts/{id}/report/index.html"

    return data

import asyncio

# Limit concurrent test executions to prevent resource exhaustion
# Initialized in startup_event
EXECUTION_SEMAPHORE: Optional[asyncio.Semaphore] = None

@app.on_event("startup")
async def startup_event():
    global EXECUTION_SEMAPHORE
    EXECUTION_SEMAPHORE = asyncio.Semaphore(2)

def execute_run_task(spec_path: str, run_dir: str, try_code_path: str = None, browser: str = "chromium"):
    # Run the CLI
    # We use python from current environment
    cmd = [sys.executable, "orchestrator/cli.py", spec_path, "--run-dir", run_dir, "--browser", browser]
    
    if try_code_path:
        cmd.extend(["--try-code", try_code_path])
    
    # We can write stdout to a log file
    log_file = Path(run_dir) / "execution.log"
    
    with open(log_file, "w") as f:
        # Note: subprocess.run is blocking, but we run it in a thread pool via the wrapper
        subprocess.run(cmd, cwd=BASE_DIR, stdout=f, stderr=subprocess.STDOUT)

async def execute_run_task_wrapper(spec_path: str, run_dir: str, try_code_path: str = None, browser: str = "chromium"):
    """
    Async wrapper that respects the concurrency semaphore.
    """
    global EXECUTION_SEMAPHORE
    if EXECUTION_SEMAPHORE is None:
        EXECUTION_SEMAPHORE = asyncio.Semaphore(2)
        
    async with EXECUTION_SEMAPHORE:
        loop = asyncio.get_event_loop()
        # Run the blocking execute_run_task in a thread pool
        # This allows other background tasks to wait on the semaphore without blocking the event loop
        await loop.run_in_executor(None, execute_run_task, spec_path, run_dir, try_code_path, browser)
        
        # Update status to completed if it hasn't been set by the task itself
        status_file = Path(run_dir) / "status.txt"
        if status_file.exists() and status_file.read_text() == "pending":
            # If the log exists, we can try to guess status, but usually the CLI writes its own status
            pass

class RunRequest(BaseModel):
    spec_name: str
    browser: Optional[str] = "chromium"

@app.post("/runs")
def create_run(request: RunRequest, background_tasks: BackgroundTasks):
    spec_path = SPECS_DIR / request.spec_name
    if not spec_path.exists():
        raise HTTPException(status_code=404, detail="Spec not found")
    
    # Generate run ID
    run_id = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    run_dir = RUNS_DIR / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    
def get_try_code_path(spec_name: str, spec_path: Path) -> Optional[str]:
    """Find existing code for a spec to avoid regeneration."""
    try_code_path = None
    spec_test_name = None
    
    # Extract test name from markdown if possible
    content = spec_path.read_text()
    for line in content.split("\n"):
        if line.startswith("# "):
            spec_test_name = line.replace("# ", "").replace("Test:", "").strip()
            break
            
    # 1. Search previous runs for this spec
    if RUNS_DIR.exists():
        # Get all subdirectories sorted by newest first
        run_dirs = sorted([d for d in RUNS_DIR.iterdir() if d.is_dir()], 
                         key=lambda x: os.path.getmtime(x), reverse=True)
        
        for r_dir in run_dirs:
            plan_file = r_dir / "plan.json"
            export_file = r_dir / "export.json"
            
            if plan_file.exists() and export_file.exists():
                try:
                    plan = json.loads(plan_file.read_text())
                    
                    match = False
                    # Check 1: Exact Spec Filename (New runs)
                    if plan.get("specFileName") == spec_name:
                        match = True
                    # Check 2: Test Name Matching (Legacy runs)
                    elif spec_test_name and plan.get("testName"):
                        # Normalize for comparison
                        t1 = plan.get("testName").lower().strip()
                        t2 = spec_test_name.lower().strip()
                        if t1 == t2 or t1 in t2 or t2 in t1:
                            match = True
                            
                    if match:
                         export = json.loads(export_file.read_text())
                         path_str = export.get("testFilePath")
                         if path_str:
                             candidate = BASE_DIR / path_str
                             # Handle relative paths from run dir
                             if not candidate.exists():
                                 candidate = r_dir / path_str
                                 
                             if candidate.exists():
                                 try_code_path = str(candidate)
                                 break
                except:
                    pass
            if try_code_path: break
        
    # 2. Key heuristic: Check typical generated file path if not found in runs
    if not try_code_path:
        stem = spec_path.stem
        candidates = [
            f"tests/generated/{stem}.spec.ts",
            f"tests/generated/{stem.replace('_', '-')}.spec.ts",
            f"tests/{stem}.spec.ts",
        ]
        for cand_str in candidates:
            cand_path = BASE_DIR / cand_str
            if cand_path.exists():
                try_code_path = str(cand_path)
                break
                
    return try_code_path

@app.post("/runs")
def create_run(request: RunRequest, background_tasks: BackgroundTasks):
    spec_path = SPECS_DIR / request.spec_name
    if not spec_path.exists():
        raise HTTPException(status_code=404, detail="Spec not found")
        
    run_id = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    run_dir = RUNS_DIR / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    
    # Save spec for reference
    (run_dir / "spec.md").write_text(spec_path.read_text())
    
    # Find existing code
    try_code_path = get_try_code_path(request.spec_name, spec_path)
    
    # Log initial status
    (run_dir / "status.txt").write_text("pending")
    
    # Run in background
    background_tasks.add_task(execute_run_task_wrapper, str(spec_path), str(run_dir), try_code_path, request.browser)
    
    return {"id": run_id, "status": "started"}

@app.post("/runs/bulk")
async def create_bulk_run(request: BulkRunRequest, background_tasks: BackgroundTasks):
    run_ids = []
    for spec_name in request.spec_names:
        spec_path = SPECS_DIR / spec_name
        if not spec_path.exists():
            continue
            
        run_id = datetime.now().strftime("%Y-%m-%d_%H-%M-%S") + f"_{spec_name.replace('/', '_')}"
        run_dir = RUNS_DIR / run_id
        run_dir.mkdir(parents=True, exist_ok=True)
        
        # Save spec content for reference
        (run_dir / "spec.md").write_text(spec_path.read_text())
        
        # Find existing code
        try_code_path = get_try_code_path(spec_name, spec_path)
        
        # Log initial status
        (run_dir / "status.txt").write_text("pending")
        
        # Add to background tasks
        background_tasks.add_task(execute_run_task_wrapper, str(spec_path), str(run_dir), try_code_path, request.browser)
        run_ids.append(run_id)
        
    return {"run_ids": run_ids, "count": len(run_ids)}

# ========= Metadata Management =========

def load_metadata():
    """Load metadata from JSON file, return empty dict if not found"""
    if not METADATA_FILE.exists():
        return {}
    try:
        return json.loads(METADATA_FILE.read_text())
    except:
        return {}

def save_metadata(metadata: dict):
    """Save metadata to JSON file"""
    METADATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    METADATA_FILE.write_text(json.dumps(metadata, indent=2))

@app.get("/spec-metadata")
def get_all_metadata():
    """Get metadata for all specs"""
    return load_metadata()

@app.get("/spec-metadata/{spec_name:path}")
def get_spec_metadata(spec_name: str):
    """Get metadata for a specific spec"""
    metadata = load_metadata()
    return metadata.get(spec_name, {"tags": [], "description": None, "author": None, "lastModified": None})

@app.put("/spec-metadata/{spec_name:path}")
def update_spec_metadata(spec_name: str, request: UpdateMetadataRequest):
    """Update metadata for a specific spec"""
    metadata = load_metadata()
    
    # Get existing or create new
    if spec_name not in metadata:
        metadata[spec_name] = {"tags": [], "description": None, "author": None, "lastModified": None}
    
    # Update fields if provided
    if request.tags is not None:
        metadata[spec_name]["tags"] = request.tags
    if request.description is not None:
        metadata[spec_name]["description"] = request.description
    if request.author is not None:
        metadata[spec_name]["author"] = request.author
    
    # Always update lastModified
    metadata[spec_name]["lastModified"] = datetime.now().isoformat()
    
    save_metadata(metadata)
    return {"status": "success", "metadata": metadata[spec_name]}
