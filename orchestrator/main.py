#!/usr/bin/env python3
"""
Natural Language to Test Script Converter - Main Orchestrator

This script ties together all components:
1. Planner: Converts spec to plan
2. Operator: Executes plan with Playwright
3. Exporter: Generates Playwright test code

Usage:
    python main.py <spec-file>
    ./convert-test <spec-file>
"""

import asyncio
import json
import sys
import os
from datetime import datetime
from pathlib import Path
from typing import Dict

# Initialize configuration and paths
try:
    import config
    config.init()
except ImportError:
    # Fallback for when running directly
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import config
    config.init()

from workflows.planner import Planner
from workflows.operator import Operator
from workflows.exporter import Exporter


def generate_run_id() -> str:
    """Generate unique run ID based on timestamp."""
    now = datetime.now()
    return now.strftime("%Y-%m-%d_%H-%M-%S")


class TestGenerator:
    """Main test generation orchestrator"""

    def __init__(self, output_base_dir: str = "runs"):
        self.output_base_dir = Path(output_base_dir)
        self.planner = Planner()
        self.operator = Operator()
        self.exporter = Exporter()

    async def generate(self, spec_path: str, test_output_dir: str = "tests/generated") -> Dict:
        """
        Generate a Playwright test from a specification.

        Args:
            spec_path: Path to the markdown specification
            test_output_dir: Where to save generated tests

        Returns:
            Dict with generation results
        """
        # Read spec
        spec_file = Path(spec_path)
        if not spec_file.exists():
            raise FileNotFoundError(f"Spec file not found: {spec_path}")

        spec_content = spec_file.read_text()

        # Create run directory
        run_id = generate_run_id()
        run_dir = self.output_base_dir / run_id
        run_dir.mkdir(parents=True, exist_ok=True)

        # Copy spec to run directory
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

        try:
            # Stage 1: Plan
            print("📋 STAGE 1: PLANNING")
            print("-" * 80)
            plan = await self.planner.create_plan(spec_content)
            plan_path = run_dir / "plan.json"

            with open(plan_path, 'w') as f:
                json.dump(plan, f, indent=2)

            print(f"✅ Plan saved to: {plan_path}")
            print(f"   Test name: {plan.get('testName')}")
            print(f"   Steps: {len(plan.get('steps', []))}")
            print()

            results["plan"] = plan

            # Stage 2: Execute
            print("🤖 STAGE 2: EXECUTING")
            print("-" * 80)
            run = await self.operator.execute_plan(plan, str(run_dir))
            run_path = run_dir / "run.json"

            with open(run_path, 'w') as f:
                json.dump(run, f, indent=2)

            print(f"✅ Run saved to: {run_path}")
            print(f"   Final state: {run.get('finalState')}")
            print(f"   Duration: {run.get('duration', 0):.1f}s")
            print(f"   Passed: {run.get('successCount', 0)}")
            print(f"   Failed: {run.get('failureCount', 0)}")
            print()

            results["run"] = run

            # Stage 3: Export
            print("📤 STAGE 3: EXPORTING")
            print("-" * 80)
            export_result = await self.exporter.export(run, test_output_dir)
            export_path = run_dir / "export.json"

            with open(export_path, 'w') as f:
                json.dump(export_result, f, indent=2)

            test_path = export_result.get('testFilePath')
            print(f"✅ Export saved to: {export_path}")
            print(f"   Test file: {test_path}")
            print(f"   Dependencies: {', '.join(export_result.get('dependencies', []))}")

            if export_result.get('notes'):
                print(f"   Notes:")
                for note in export_result['notes']:
                    print(f"     • {note}")
            print()

            results["export"] = export_result
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
            print("To run the generated test:")
            print(f"  npx playwright test {test_path}")
            print()

            return results

        except Exception as e:
            print()
            print("=" * 80)
            print("❌ TEST GENERATION FAILED")
            print("=" * 80)
            print(f"Error: {e}")

            import traceback
            traceback.print_exc()

            results["status"] = "error"
            results["error"] = str(e)

            raise


async def main():
    """Main entry point"""

    # Check arguments
    if len(sys.argv) < 2:
        print("Usage: python main.py <spec-file>")
        print("       ./convert-test <spec-file>")
        print()
        print("Example:")
        print("  python main.py specs/01_simple_navigation.md")
        print("  ./convert-test specs/02_form_interaction.md")
        sys.exit(1)

    spec_path = sys.argv[1]

    # Create generator
    generator = TestGenerator()

    # Generate test
    try:
        result = await generator.generate(spec_path)

        # Save results summary
        summary_path = Path(result['run_dir']) / "summary.json"
        with open(summary_path, 'w') as f:
            json.dump(result, f, indent=2)

        print(f"✅ Summary saved to: {summary_path}")
        print()
        print("🎉 All artifacts saved in:", result['run_dir'])

        sys.exit(0)

    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    # Set up asyncio to handle the SDK cleanup error gracefully
    try:
        asyncio.run(main())
    except RuntimeError as e:
        # Ignore the known cleanup error
        if "cancel scope" not in str(e).lower():
            raise
