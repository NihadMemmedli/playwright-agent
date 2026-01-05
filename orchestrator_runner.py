#!/usr/bin/env python3
"""
Orchestrator Runner
Runs the test generation pipeline stages as isolated subprocesses.
"""

import subprocess
import sys
import json
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional

# Constants
VENV_ACTIVATE = "source orchestrator/venv/bin/activate"


def run_command(command: str, stream_output: bool = False) -> subprocess.CompletedProcess:
    """
    Run a shell command in the python virtual environment.
    
    Args:
        command: The python command to run
        stream_output: Whether to print stdout in real-time
        
    Returns:
        CompletedProcess object
    """
    full_cmd = f"{VENV_ACTIVATE} && {command}"
    
    if stream_output:
        # For streaming, we use Popen but wrap it to look like run() result
        process = subprocess.Popen(
            full_cmd,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1  # Line buffered
        )
        
        stdout_lines = []
        while True:
            output = process.stdout.readline()
            if output == '' and process.poll() is not None:
                break
            if output:
                print(output.strip())
                stdout_lines.append(output)
                sys.stdout.flush()
        
        stderr = process.stderr.read()
        return_code = process.poll()
        
        # Mock CompletedProcess
        result = subprocess.CompletedProcess(args=full_cmd, returncode=return_code)
        result.stdout = "".join(stdout_lines)
        result.stderr = stderr
        return result
    else:
        # Standard run
        return subprocess.run(
            full_cmd,
            shell=True,
            capture_output=True,
            text=True
        )


def print_output(result: subprocess.CompletedProcess):
    """Print stdout and safe stderr from process result."""
    if result.stdout and not result.stdout.strip() == "":
        # If we didn't stream it, print it now (avoid double printing)
        pass 
        
    if result.stderr and "cancel scope" not in result.stderr:
        print(f"STDERR: {result.stderr}", file=sys.stderr)


def main():
    if len(sys.argv) < 2:
        print("Usage: ./convert-test <spec-file>")
        sys.exit(1)

    spec_path = sys.argv[1]
    spec_file = Path(spec_path)

    if not spec_file.exists():
        print(f"❌ Spec file not found: {spec_path}")
        sys.exit(1)

    # Setup Run Directory
    run_id = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    run_dir = Path(f"runs/{run_id}")
    run_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 80)
    print(f"🚀 CONVERTING TEST: {spec_file.name}")
    print("=" * 80)
    print()

    # --- STAGE 1: PLAN ---
    print("📋 Stage 1: Creating test plan...")
    result = run_command(f"python orchestrator/workflows/planner.py '{spec_path}'")
    print_output(result)

    plan_src = Path("runs/test_plan.json")
    if plan_src.exists():
        shutil.move(plan_src, run_dir / "plan.json")
        print(f"✅ Plan saved to: {run_dir / 'plan.json'}")
    else:
        print("❌ Plan not found")
        sys.exit(1)

    # Test Plan Summary
    plan = json.loads((run_dir / "plan.json").read_text())
    print(f"   Test: {plan.get('testName')}")
    print(f"   Steps: {len(plan.get('steps', []))}")
    print()

    # --- STAGE 2: EXECUTE ---
    print("🤖 Stage 2: Executing test plan...")
    # Use streaming for Operator to show live progress
    result = run_command(
        f"python -u orchestrator/workflows/operator.py '{run_dir / 'plan.json'}' '{run_dir}'",
        stream_output=True
    )
    print_output(result)

    run_file = run_dir / "run.json"
    if run_file.exists():
        print(f"✅ Run saved to: {run_file}")
        run = json.loads(run_file.read_text())
        print(f"   Final state: {run.get('finalState')}")
        print(f"   Duration: {run.get('duration', 0):.1f}s")
    else:
        print("❌ Run not found")
        sys.exit(1)
    print()

    # --- STAGE 3: EXPORT ---
    print("📤 Stage 3: Generating test code...")
    result = run_command(f"python orchestrator/workflows/exporter.py '{run_dir / 'run.json'}'")
    print_output(result)
    
    # Check stdout for export result if needed, but we look for file
    if result.stdout:
        print(result.stdout)

    export_file = run_dir / "export.json"
    if export_file.exists():
        print(f"✅ Export saved to: {export_file}")
        export_data = json.loads(export_file.read_text())
        test_path = export_data.get('testFilePath')
        print(f"   Test file: {test_path}")
    else:
        print("❌ Export not found")
        sys.exit(1)
    print()

    # --- STAGE 4: VALIDATE ---
    print("🔍 Stage 4: Validating generated test...")
    result = run_command(f"python orchestrator/workflows/validator.py '{test_path}' '{run_dir}'")
    print_output(result)
    
    if result.stdout:
        print(result.stdout)

    validation_file = run_dir / "validation.json"
    validation_data = {}
    if validation_file.exists():
        validation_data = json.loads(validation_file.read_text())
        if validation_data.get('status') == 'success':
            print(f"✅ Validation passed after {validation_data.get('attempts', 1)} attempt(s)")
        else:
            print(f"⚠️  Validation had issues: {validation_data.get('message')}")
    print()

    # --- SUMMARY ---
    print("=" * 80)
    print("✅ CONVERSION COMPLETE")
    print("=" * 80)
    print(f"Test file: {test_path}")
    print(f"Artifacts: {run_dir}")
    if validation_data.get('status') == 'success':
        print(f"✅ Test validated and passing")
    print()
    print("To run the test:")
    print(f"  npx playwright test {test_path}")
    print()


if __name__ == "__main__":
    main()
