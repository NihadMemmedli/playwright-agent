#!/usr/bin/env python3
"""
Simple Orchestrator - Runs each component as separate subprocess
"""

import subprocess
import sys
import json
from datetime import datetime
from pathlib import Path


def main():
    if len(sys.argv) < 2:
        print("Usage: ./convert-test <spec-file>")
        sys.exit(1)

    spec_path = sys.argv[1]
    spec_file = Path(spec_path)

    if not spec_file.exists():
        print(f"❌ Spec file not found: {spec_path}")
        sys.exit(1)

    # Create run directory
    run_id = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    run_dir = Path(f"runs/{run_id}")
    run_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 80)
    print(f"🚀 CONVERTING TEST: {spec_file.name}")
    print("=" * 80)
    print()

    # Stage 1: Plan
    print("📋 Stage 1: Creating test plan...")
    result = subprocess.run(
        f"source orchestrator/venv/bin/activate && python orchestrator/workflows/planner.py '{spec_path}'",
        shell=True,
        capture_output=True,
        text=True
    )

    # Print output for debugging
    if result.stdout:
        print(result.stdout)
    if result.stderr and "cancel scope" not in result.stderr:
        print(f"STDERR: {result.stderr}", file=sys.stderr)

    # Move plan to run directory
    import shutil
    plan_src = Path("runs/test_plan.json")
    if plan_src.exists():
        shutil.move(plan_src, run_dir / "plan.json")
        print(f"✅ Plan saved to: {run_dir / 'plan.json'}")
    else:
        print("❌ Plan not found")
        sys.exit(1)

    # Read plan for info
    plan = json.loads((run_dir / "plan.json").read_text())
    print(f"   Test: {plan.get('testName')}")
    print(f"   Steps: {len(plan.get('steps', []))}")
    print()

    # Stage 2: Execute
    print("🤖 Stage 2: Executing test plan...")
    # Stream output for Operator stage to avoid buffering issues and see progress
    process = subprocess.Popen(
        f"source orchestrator/venv/bin/activate && python -u orchestrator/workflows/operator.py '{run_dir / 'plan.json'}' '{run_dir}'",
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1  # Line buffered
    )

    # Read output in real-time
    stdout_lines = []
    while True:
        output = process.stdout.readline()
        if output == '' and process.poll() is not None:
            break
        if output:
            print(output.strip())
            stdout_lines.append(output)
            sys.stdout.flush()
    
    # Capture stderr
    stderr_output = process.stderr.read()
    if stderr_output and "cancel scope" not in stderr_output:
        print(f"STDERR: {stderr_output}", file=sys.stderr)

    return_code = process.poll()
    
    # Mock a result object for compatibility with existing code
    class Result:
        pass
    result = Result()
    result.returncode = return_code
    result.stdout = "".join(stdout_lines)
    result.stderr = stderr_output

    # Print output for debugging
    if result.stdout:
        print(result.stdout)
    if result.stderr and "cancel scope" not in result.stderr:
        print(f"STDERR: {result.stderr}", file=sys.stderr)

    run_file = run_dir / "run.json"
    if run_file.exists():
        print(f"✅ Run saved to: {run_file}")
        run = json.loads(run_file.read_text())
        print(f"   Final state: {run.get('finalState')}")
        print(f"   Duration: {run.get('duration', 0):.1f}s")
    else:
        print("❌ Run not found")
        print(f"   Return code: {result.returncode}")
        sys.exit(1)
    print()

    # Stage 3: Export
    print("📤 Stage 3: Generating test code...")
    result = subprocess.run(
        f"source orchestrator/venv/bin/activate && python orchestrator/workflows/exporter.py '{run_dir / 'run.json'}'",
        shell=True,
        capture_output=True,
        text=True
    )

    # Print output for debugging
    if result.stdout:
        print(result.stdout)
    if result.stderr and "cancel scope" not in result.stderr:
        print(f"STDERR: {result.stderr}", file=sys.stderr)

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

    # Stage 4: Validate
    print("🔍 Stage 4: Validating generated test...")
    result = subprocess.run(
        f"source orchestrator/venv/bin/activate && python orchestrator/workflows/validator.py '{test_path}' '{run_dir}'",
        shell=True,
        capture_output=True,
        text=True
    )

    # Print output for debugging
    if result.stdout:
        print(result.stdout)
    if result.stderr and "cancel scope" not in result.stderr:
        print(f"STDERR: {result.stderr}", file=sys.stderr)

    # Read validation result
    validation_file = run_dir / "validation.json"
    validation_data = {}
    if validation_file.exists():
        validation_data = json.loads(validation_file.read_text())
        if validation_data.get('status') == 'success':
            print(f"✅ Validation passed after {validation_data.get('attempts', 1)} attempt(s)")
        else:
            print(f"⚠️  Validation had issues: {validation_data.get('message')}")
    print()

    # Summary
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
