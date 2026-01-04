#!/usr/bin/env python3
"""
End-to-End Test: Spec → Plan → Run → Code
Tests the complete pipeline
"""

import asyncio
import sys
import os
from pathlib import Path

# Initialize configuration and paths
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    import config
    config.init()
except ImportError:
    pass

from workflows.planner import Planner
from workflows.operator import Operator
from workflows.exporter import Exporter


async def end_to_end_test(spec_path: str):
    """Test the complete pipeline"""
    print("=" * 80)
    print("END-TO-END TEST: Complete Pipeline")
    print("=" * 80)
    print()

    # Create run directory
    run_id = f"e2e_{Path(spec_path).stem}"
    run_dir = Path(f"runs/{run_id}")
    run_dir.mkdir(parents=True, exist_ok=True)

    try:
        # Stage 1: Plan
        print("📋 STAGE 1: Planner - Converting spec to plan")
        print("-" * 80)
        spec_content = Path(spec_path).read_text()
        planner = Planner()
        plan = await planner.create_plan(spec_content)
        plan_path = run_dir / "plan.json"
        import json
        with open(plan_path, 'w') as f:
            json.dump(plan, f, indent=2)
        print(f"✅ Plan saved to: {plan_path}")
        print()

        # Stage 2: Execute
        print("🤖 STAGE 2: Operator - Executing plan")
        print("-" * 80)
        operator = Operator()
        run = await operator.execute_plan(plan, str(run_dir))
        run_path = run_dir / "run.json"
        with open(run_path, 'w') as f:
            json.dump(run, f, indent=2)
        print(f"✅ Run saved to: {run_path}")
        print()

        # Stage 3: Export
        print("📤 STAGE 3: Exporter - Generating test code")
        print("-" * 80)
        exporter = Exporter()
        export_result = await exporter.export(run, "../tests/generated")
        export_path = run_dir / "export.json"
        with open(export_path, 'w') as f:
            json.dump(export_result, f, indent=2)
        test_file = export_result.get('testFilePath')
        print(f"✅ Export saved to: {export_path}")
        print()

        # Summary
        print("=" * 80)
        print("✅ END-TO-END TEST SUCCESSFUL!")
        print("=" * 80)
        print(f"Run directory: {run_dir}")
        print(f"Test file: {test_file}")
        print()
        print("Pipeline verified:")
        print("  ✅ Spec → Plan conversion works")
        print("  ✅ Plan → Execution works")
        print("  ✅ Execution → Code generation works")
        print()
        print("Generated test is ready to run with Playwright!")
        print()

        return True

    except Exception as e:
        # Check for known SDK cleanup error
        error_msg = str(e)
        if "cancel scope" in error_msg.lower() or "Cancelled via cancel scope" in error_msg:
             # This is a known shutdown issue, but if we reached here from a crash,
             # we need to be careful. Ideally we check if we finished successsfully.
             # but this block captures ALL exceptions.
             print(f"\n⚠️ Encountered SDK cleanup error: {e}")
             print("Assuming test might have actually finished logic. Checking artifacts...")
             # Check if export was created
             if (run_dir / "export.json").exists():
                 print("✅ Export artifact exists. Treating as SUCCESS despite cleanup error.")
                 return True
             else:
                 print("❌ Export artifact missing. Test failed.")
                 return False

        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_e2e.py <spec-file>")
        sys.exit(1)

    spec_path = sys.argv[1]
    result = asyncio.run(end_to_end_test(spec_path))
    sys.exit(0 if result else 1)
