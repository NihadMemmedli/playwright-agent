from pathlib import Path
import json
import os
from datetime import datetime
from typing import Dict, List, Any
from collections import defaultdict, Counter
from fastapi import APIRouter

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parent.parent.parent
RUNS_DIR = BASE_DIR / "runs"

@router.get("/dashboard")
def get_dashboard_stats() -> Dict[str, Any]:
    """
    Aggregates statistics from all runs in the runs directory.
    """
    runs_dir = RUNS_DIR
    
    # Data structures for aggregation
    daily_stats = defaultdict(lambda: {"total": 0, "passed": 0, "failed": 0, "duration_sum": 0, "duration_count": 0})
    error_counts = Counter()
    runs_list = []
    
    total_specs = 0
    # Process Specs
    specs_dir = BASE_DIR / "specs"
    if specs_dir.exists():
        total_specs = len(list(specs_dir.glob("**/*.md")))

    if not runs_dir.exists():
        return {
            "total_specs": total_specs,
            "total_runs": 0,
            "success_rate": 0,
            "last_run": "Never",
            "trends": [],
            "errors": [],
            "recent_runs": []
        }

    # Iterate through all run directories
    for run_path in runs_dir.iterdir():
        if not run_path.is_dir():
            continue
            
        run_file = run_path / "run.json"
        if not run_file.exists():
            continue
            
        try:
            run_data = json.loads(run_file.read_text())
            
            # Extract basic info
            run_id = run_path.name
            timestamp = 0
            date_str = "Unknown"
            
            try:
                dt = datetime.strptime(run_id, "%Y-%m-%d_%H-%M-%S")
                timestamp = dt.timestamp()
                date_str = dt.strftime("%Y-%m-%d")
            except ValueError:
                timestamp = os.path.getmtime(run_path)
                date_str = datetime.fromtimestamp(timestamp).strftime("%Y-%m-%d")
            
            status = run_data.get("finalState", "unknown")
            duration = run_data.get("duration", 0)
            
            # --- Aggregate Daily Trends ---
            daily_stats[date_str]["total"] += 1
            if status == "passed":
                daily_stats[date_str]["passed"] += 1
                daily_stats[date_str]["duration_sum"] += duration
                daily_stats[date_str]["duration_count"] += 1
            else:
                daily_stats[date_str]["failed"] += 1
                
                error_found = False
                for step in run_data.get("steps", []):
                    if step.get("error"):
                        err_msg = step.get("error").split("\n")[0][:100]
                        if "Timeout" in err_msg:
                            cat = "Timeout"
                        elif "waiting for selector" in err_msg or "Target closed" in err_msg:
                            cat = "Selector/ Element Issue"
                        elif "expect" in err_msg:
                            cat = "Assertion Failed"
                        else:
                            cat = "Other Error"
                        error_counts[cat] += 1
                        error_found = True
                        break 
                
                if not error_found:
                    error_counts["Unknown Failure"] += 1

            runs_list.append({
                "id": run_id,
                "date": date_str,
                "status": status,
                "duration": duration,
                "timestamp": timestamp
            })

        except Exception as e:
            print(f"Error processing run {run_path}: {e}")
            continue

    # Format Output
    trends = []
    for date, stats in sorted(daily_stats.items()):
        avg_duration = 0
        if stats["duration_count"] > 0:
            avg_duration = stats["duration_sum"] / stats["duration_count"]
            
        trends.append({
            "date": date,
            "total": stats["total"],
            "passed": stats["passed"],
            "failed": stats["failed"],
            "avg_duration": round(avg_duration, 2)
        })
        
    errors = [{"category": k, "count": v} for k, v in error_counts.most_common(5)]
    
    # Calculate aggregates
    total_runs = len(runs_list)
    passed_runs = sum(1 for r in runs_list if r["status"] == "passed")
    success_rate = round((passed_runs / total_runs * 100), 1) if total_runs > 0 else 0
    
    last_run = "Never"
    if runs_list:
        # Sort by timestamp desc
        last_run_obj = sorted(runs_list, key=lambda x: x["timestamp"], reverse=True)[0]
        # Format relative time or just date? frontend expects string. Use relative logic later or just ID for now
        last_run = last_run_obj["id"]

    return {
        "total_specs": total_specs,
        "total_runs": total_runs,
        "success_rate": success_rate,
        "last_run": last_run,
        "trends": trends,
        "errors": errors
    }
