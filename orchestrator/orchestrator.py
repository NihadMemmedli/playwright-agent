#!/usr/bin/env python3
"""
Natural Language to Test Script Converter - Orchestrator

Runs each component as a separate process to avoid SDK cleanup issues.
"""

import subprocess
import json
import sys
import os
from datetime import datetime
from pathlib import Path


def generate_run_id() -> str:
    """Generate unique run ID based on timestamp."""
    now = datetime.now()
    return now.strftime("%Y-%m-%d_%H-%M-%S")


def run_component(script_path: str, args: list) -> dict:
    """Run a component script and return the result."""
    cmd = ["python", "-c", f"import sys; sys.path.insert(0, '{os.path.dirname(os.path.abspath(__file__))}');"]
    cmd.extend(args)

    try:
        result = subprocess.run(
            ["source", "orchestrator/venv/bin/activate", "&&", "python"] + args,
            capture_output=True,
            text=True,
            shell=True,
            cwd=Path(os.getcwd())
        )

        if result.returncode != 0:
            print(f"❌ Component failed: {args}")
            print(f"STDOUT:\n{result.stdout}")
            print(f"STDERR:\n{result.stderr}")
            return None

        return result.stdout

    except Exception as e:
        print(f"❌ Error running component: {e}")
        return None


def orchestrator(spec_path: str):
    """Orchestrate the complete pipeline"""

    # Read spec
    spec_file = Path(spec_path)
    if not spec_file.exists():
        print(f"❌ Spec file not found: {spec_path}")
        sys.exit(1)

    spec_content = spec_file.read_text()

    # Create run directory
    run_id = generate_run_id()
    run_dir = Path(f"runs/{run_id}")
    run_dir.mkdir(parents=True, exist_ok=True)

    # Copy spec
    (run_dir / "spec.md").write_text(spec_content)

    print("=" * 80)
    print(f"🚀 TEST GENERATION: {spec_file.name}")
    print("=" * 80)
    print(f"Run ID: {run_id}")
    print(f"Run directory: {run_dir}")
    print()

    results = {
        "spec_file": str(spec_file),
        "run_id": run_id,
        "run_dir": str(run_dir)
    }

    # Stage 1: Plan
    print("📋 STAGE 1: PLANNING")
    print("-" * 80)

    plan_result = subprocess.run(
        "source orchestrator/venv/bin/activate && python orchestrator/workflows/planner.py " + spec_path,
        capture_output=True,
        text=True,
        shell=True
    )

    # The planner saves to runs/test_plan.json, we need to move it
    import shutil
    if Path("runs/test_plan.json").exists():
        shutil.move("runs/test_plan.json", run_dir / "plan.json")

    # Read the plan
    plan = json.loads((run_dir / "plan.json").read_text())
    print(f"✅ Plan created: {plan.get('testName')}")
    print(f"   Steps: {len(plan.get('steps', []))}")
    print()

    results["plan"] = plan

    # Stage 2: Execute
    print("🤖 STAGE 2: EXECUTING")
    print("-" * 80)

    run_result = subprocess.run(
        f"source orchestrator/venv/bin/activate && python orchestrator/workflows/operator.py {run_dir / 'plan.json'}",
        capture_output=True,
        text=True,
        shell=True
    )

    # Read the run (operator saves it)
    run = json.loads((run_dir / "run.json").read_text())
    print(f"✅ Execution complete: {run.get('finalState')}")
    print(f"   Duration: {run.get('duration', 0):.1f}s")
    print(f"   Passed: {run.get('successCount', 0)}")
    print()

    results["run"] = run

    # Stage 3: Export
    print("📤 STAGE 3: EXPORTING")
    print("-" * 80)

    export_result = subprocess.run(
        f"source orchestrator/venv/bin/activate && python orchestrator/workflows/exporter.py {run_dir / 'run.json'}",
        capture_output=True,
        text=True,
        shell=True
    )

    # Read the export
    export_data = json.loads((run_dir / "export.json").read_text())
    test_path = export_data.get('testFilePath')
    print(f"✅ Test generated: {test_path}")
    print()

    results["export"] = export_data
    results["test_file"] = test_path
    results["status"] = "success"

    # Summary
    print("=" * 80)
    print("✅ TEST GENERATION COMPLETE")
    print("=" * 80)
    print(f"Spec: {spec_file.name}")
    print(f"Test name: {plan.get('testName')}")
    print(f"Final state: {run.get('finalState')}")
    print(f"Generated test: {test_path}")
    print(f"Run directory: {run_dir}")
    print()

    # Save summary
    (run_dir / "summary.json").write_text(json.dumps(results, indent=2))

    print("To run the generated test:")
    print(f"  npx playwright test {test_path}")
    print()

    return results


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python orchestrator.py <spec-file>")
        print("       ./convert-test <spec-file>")
        sys.exit(1)

    spec_path = sys.argv[1]

    try:
        orchestrator(spec_path)
        print("🎉 All artifacts saved in:", results['run_dir'])
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
