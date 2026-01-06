from pathlib import Path
import json
import os
from datetime import datetime
from typing import Dict, List, Any
from collections import defaultdict, Counter

def get_dashboard_stats(runs_dir: Path) -> Dict[str, Any]:
    """
    Aggregates statistics from all runs in the runs directory.
    """
    
    # Data structures for aggregation
    daily_stats = defaultdict(lambda: {"total": 0, "passed": 0, "failed": 0, "duration_sum": 0, "duration_count": 0})
    error_counts = Counter()
    runs_list = []
    
    if not runs_dir.exists():
        return {
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
            # Try to partial parse date from run_id if it matches pattern YYYY-MM-DD_...
            # Otherwise use file mtime
            timestamp = 0
            date_str = "Unknown"
            
            try:
                # Expected format: 2024-01-01_12-00-00
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
                
                # --- Aggregate Errors ---
                # Look for error in steps or top level
                # This is a heuristic - we might need to refine how we extract "primary error"
                error_found = False
                for step in run_data.get("steps", []):
                    if step.get("error"):
                        # Simplify error message to category if possible
                        # e.g. "Timeout occurred" or "Selector not found"
                        err_msg = step.get("error").split("\n")[0][:100] # First line, max 100 chars
                        
                        # Simple categorization
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
                        break # Count one error per failed run
                
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
    
    # 1. Trends
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
        
    # 2. Top Errors
    errors = [{"category": k, "count": v} for k, v in error_counts.most_common(5)]
    
    return {
        "trends": trends,
        "errors": errors,
        "total_runs": len(runs_list)
    }
