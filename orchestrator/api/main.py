from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import json
import uuid
from datetime import datetime
import subprocess
import sys
import os
from typing import List
from pydantic import BaseModel
from .models import TestSpec, TestRun, CreateSpecRequest

app = FastAPI(title="Playwright Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent.parent.parent
SPECS_DIR = BASE_DIR / "specs"
RUNS_DIR = BASE_DIR / "runs"

@app.get("/stats")
def get_stats():
    # Count specs
    spec_count = 0
    if SPECS_DIR.exists():
        spec_count = len(list(SPECS_DIR.glob("*.md")))
    
    # Calculate success rate
    total_runs = 0
    passed_runs = 0
    last_run_time = "Never"
    
    if RUNS_DIR.exists():
        runs = [d for d in RUNS_DIR.iterdir() if d.is_dir()]
        total_runs = len(runs)
        
        # Sort by modification time (latest first)
        runs.sort(key=lambda x: os.path.getmtime(x), reverse=True)
        
        if runs:
            latest_run = runs[0]
            # Try to format timestamp if folder name matches pattern, else use mtime
            try:
                # Check if name is like YYYY-MM-DD_HH-MM-SS
                if len(latest_run.name) == 19 and latest_run.name.count("_") >= 1:
                    parts = latest_run.name.split("_")
                    last_run_time = f"{parts[0]} {parts[1].replace('-', ':')}"
                else:
                    # Use modification time
                    ts = os.path.getmtime(latest_run)
                    dt = datetime.fromtimestamp(ts)
                    last_run_time = dt.strftime("%Y-%m-%d %H:%M:%S")
            except:
                last_run_time = latest_run.name

        for d in runs:
            run_file = d / "run.json"
            if run_file.exists():
                try:
                    data = json.loads(run_file.read_text())
                    if data.get("finalState") == "passed":
                        passed_runs += 1
                except:
                    pass
    
    success_rate = 0
    if total_runs > 0:
        success_rate = int((passed_runs / total_runs) * 100)
        
    return {
        "total_specs": spec_count,
        "total_runs": total_runs,
        "success_rate": success_rate,
        "last_run": last_run_time
    }

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/specs", response_model=List[TestSpec])
def list_specs():
    specs = []
    if SPECS_DIR.exists():
        for f in SPECS_DIR.glob("*.md"):
            specs.append(TestSpec(
                name=f.name,
                path=str(f.absolute()),
                content=f.read_text()
            ))
    return specs

@app.get("/specs/{name}")
def get_spec(name: str):
    f = SPECS_DIR / name
    if not f.exists():
        raise HTTPException(status_code=404, detail="Spec not found")
    return TestSpec(
        name=f.name,
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
    
    f.write_text(request.content)
    return {"status": "created", "path": str(f.absolute())}

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
            
            # 1. Try to get Plan info
            if plan_file.exists():
                try:
                    plan = json.loads(plan_file.read_text())
                    test_name = plan.get("testName")
                    total = len(plan.get("steps", []))
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
                total_steps=total
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
        
    return data

def execute_run_task(spec_path: str, run_dir: str):
    # Run the CLI
    # We use python from current environment
    cmd = [sys.executable, "orchestrator/cli.py", spec_path, "--run-dir", run_dir]
    
    # We can write stdout to a log file
    log_file = Path(run_dir) / "execution.log"
    
    with open(log_file, "w") as f:
        subprocess.run(cmd, cwd=BASE_DIR, stdout=f, stderr=subprocess.STDOUT)

class RunRequest(BaseModel):
    spec_name: str

@app.post("/runs")
def create_run(request: RunRequest, background_tasks: BackgroundTasks):
    spec_path = SPECS_DIR / request.spec_name
    if not spec_path.exists():
        raise HTTPException(status_code=404, detail="Spec not found")
    
    # Generate run ID
    run_id = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    run_dir = RUNS_DIR / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    
    # Log initial status
    (run_dir / "status.txt").write_text("pending")
    
    # Trigger execution
    background_tasks.add_task(execute_run_task, str(spec_path), str(run_dir))
    
    return {"status": "started", "id": run_id}
