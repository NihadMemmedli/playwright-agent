#!/usr/bin/env python3
"""
Playwright Agent CLI
Entry point for natural language test generation.
"""

import argparse
import sys
import json
import shutil
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Optional


def run_command(
    command: str, 
    stream_output: bool = False, 
    interactive: bool = False,
    is_python: bool = True
) -> subprocess.CompletedProcess:
    """
    Run a shell command using the current python executable.

    Args:
        command: The command string
        stream_output: Whether to print stdout in real-time
        interactive: Whether to attach stdin/stdout for user interaction
        is_python: Whether to prefix with python executable (default: True)

    Returns:
        CompletedProcess object
    """
    # Use the same python interpreter that launch this CLI
    if is_python:
        python_exe = sys.executable
        full_cmd = f'"{python_exe}" {command}'
    else:
        full_cmd = command

    if interactive:
        # Run interactively, inheriting stdio
        return subprocess.run(full_cmd, shell=True)

    if stream_output:
        process = subprocess.Popen(
            full_cmd,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
        )

        stdout_lines = []
        while True:
            output = process.stdout.readline()
            if output == "" and process.poll() is not None:
                break
            if output:
                print(output.strip())
                stdout_lines.append(output)
                sys.stdout.flush()

        stderr = process.stderr.read()
        return_code = process.poll()

        result = subprocess.CompletedProcess(args=full_cmd, returncode=return_code)
        result.stdout = "".join(stdout_lines)
        result.stderr = stderr
        return result
    else:
        return subprocess.run(full_cmd, shell=True, capture_output=True, text=True)


def print_output(result: subprocess.CompletedProcess):
    """Print stdout and safe stderr from process result."""
    if result.stderr and "cancel scope" not in result.stderr:
        print(f"STDERR: {result.stderr}", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(
        description="Convert natural language test specs to Playwright code."
    )
    parser.add_argument("spec", help="Path to the markdown specification file")
    parser.add_argument(
        "--interactive",
        "-i",
        action="store_true",
        help="Enable interactive mode (plan review and step confirmation)",
    )
    parser.add_argument(
        "--run-dir",
        help="Specific directory to store run artifacts",
    )

    parser.add_argument(
        "--try-code",
        help="Path to existing generated code to try before regenerating",
    )

    args = parser.parse_args()
    spec_path = args.spec
    spec_file = Path(spec_path)

    if not spec_file.exists():
        print(f"❌ Spec file not found: {spec_path}")
        sys.exit(1)

    # Setup Run Directory
    if args.run_dir:
        run_dir = Path(args.run_dir)
    else:
        run_id = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        run_dir = Path(f"runs/{run_id}")
    
    run_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 80)
    print(f"🚀 CONVERTING TEST: {spec_file.name}")
    print("=" * 80)
    print()

    # Helpers
    def extract_test_name(path: Path) -> str:
        try:
            content = path.read_text()
            for line in content.splitlines():
                if line.startswith("# "):
                    return line.replace("# ", "").replace("Test:", "").strip()
        except:
            pass
        return path.stem.replace("_", " ").title()

    # --- STAGE 0: CHECK EXISTING CODE ---
    should_regenerate = True
    test_path = None
    
    if args.try_code:
        code_path = Path(args.try_code)
        if code_path.exists():
            print(f"🔄 Stage 0: Trying existing code: {code_path}")
            
            # Create export.json to expose code to UI immediately
            export_data = {
                "testFilePath": str(code_path),
                "code": code_path.read_text(),
                "dependencies": []
            }
            (run_dir / "export.json").write_text(json.dumps(export_data, indent=2))
            
            # Create minimal plan.json so UI shows the correct Test Name
            test_name = extract_test_name(spec_file)
            plan_data = {
                "testName": test_name,
                "steps": [], # We don't have steps if we reuse code, UI will handle empty steps
                "specFileName": spec_file.name,
                "specFilePath": str(spec_file.absolute())
            }
            (run_dir / "plan.json").write_text(json.dumps(plan_data, indent=2))
            
            # Run the test
            output_dir = run_dir / "test-results"
            cmd = f"PLAYWRIGHT_OUTPUT_DIR='{output_dir}' npx playwright test '{code_path}'"
            print(f"   Executing: {cmd}")
            sys.stdout.flush() 
            
            result = run_command(cmd, stream_output=True, is_python=False)
            
            if result.returncode == 0:
                print("✅ Existing code passed! Skipping generation.")
                
                run_data = {
                    "finalState": "passed",
                    "duration": 0,
                    "steps": [], 
                    "notes": ["Reused existing code"]
                }
                (run_dir / "run.json").write_text(json.dumps(run_data, indent=2))
                
                print("✅ Run artifacts created.")
                return
            else:
                print("⚠️ Existing code failed. Attempting to heal...")
                if result.stdout:
                    print(result.stdout)
                if result.stderr:
                    print(result.stderr)
                
                # HEALING PATH: Skip generation and go straight to Validation (Step 4)
                should_regenerate = False
                test_path = str(code_path)
                print("🔧 Skipping plan/execute stages -> Jumping to Self-Healing (Stage 4).")
                print()

    if should_regenerate:
        # --- STAGE 1: PLAN ---
        print("📋 Stage 1: Creating test plan...")
        # Invoke inner modules using -m to ensure package resolution works
        result = run_command(f"-m orchestrator.workflows.planner '{spec_path}'")
        print_output(result)

        plan_src = Path("runs/test_plan.json")
        if plan_src.exists():
            shutil.move(plan_src, run_dir / "plan.json")
            
            # INJECT METADATA
            try:
                plan_data = json.loads((run_dir / "plan.json").read_text())
                plan_data["specFileName"] = spec_file.name
                plan_data["specFilePath"] = str(spec_file.absolute())
                (run_dir / "plan.json").write_text(json.dumps(plan_data, indent=2))
            except Exception as e:
                print(f"⚠️ Failed to inject metadata: {e}")

            print(f"✅ Plan saved to: {run_dir / 'plan.json'}")
        else:
            print("❌ Plan not found")
            if result.stdout:
                print(result.stdout)
            sys.exit(1)

        # Test Plan Summary
        try:
            plan = json.loads((run_dir / "plan.json").read_text())
            print(f"   Test: {plan.get('testName')}")
            print(f"   Steps: {len(plan.get('steps', []))}")
        except Exception as e:
            print(f"⚠️ Could not read plan summary: {e}")
        print()

        # Interactive Review Loop
        if args.interactive:
            while True:
                print("=" * 40)
                print("🤔 Plan Review")
                print("  [c] Continue to execution")
                print("  [e] Edit plan manually")
                print("  [q] Quit")
                choice = input("Option: ").lower().strip()

                if choice == "q":
                    sys.exit(0)
                elif choice == "e":
                    print(f"✏️  Edit the file at: {run_dir / 'plan.json'}")
                    input("Press Enter when done editing...")
                    try:
                        plan = json.loads((run_dir / "plan.json").read_text())
                        print("✅ Plan reloaded.")
                    except Exception as e:
                        print(f"❌ Invalid JSON: {e}")
                        continue
                elif choice == "c":
                    break

        # --- STAGE 2: EXECUTE ---
        print("🤖 Stage 2: Executing test plan...")

        cmd = f"-u -m orchestrator.workflows.operator '{run_dir / 'plan.json'}' '{run_dir}'"
        if args.interactive:
            cmd += " --interactive"

        result = run_command(cmd, stream_output=True, interactive=args.interactive)
        if not args.interactive:
            print_output(result)

        run_file = run_dir / "run.json"
        if run_file.exists():
            print(f"✅ Run saved to: {run_file}")
            try:
                run = json.loads(run_file.read_text())
                print(f"   Final state: {run.get('finalState')}")
                print(f"   Duration: {run.get('duration', 0):.1f}s")
            except:
                pass
        else:
            print("❌ Run not found")
            sys.exit(1)

        # --- REPORT GENERATION ---
        try:
            from orchestrator.reporting.report_generator import ReportGenerator

            generator = ReportGenerator(str(run_dir))
            generator.generate()
        except Exception as e:
            print(f"⚠️ Report generation failed: {e}")
        print()

        # --- STAGE 3: EXPORT ---
        print("📤 Stage 3: Generating test code...")
        result = run_command(f"-m orchestrator.workflows.exporter '{run_dir / 'run.json'}'")
        print_output(result)

        export_file = run_dir / "export.json"
        if export_file.exists():
            print(f"✅ Export saved to: {export_file}")
            try:
                export_data = json.loads(export_file.read_text())
                test_path = export_data.get("testFilePath")
                print(f"   Test file: {test_path}")
            except:
                test_path = None
        else:
            print("❌ Export not found")
            if result.stdout:
                print(result.stdout)
            sys.exit(1)
        print()

    # --- STAGE 4: VALIDATE ---
    if test_path:
        print("🔍 Stage 4: Validating generated test...")
        result = run_command(
            f"-m orchestrator.workflows.validator '{test_path}' '{run_dir}'"
        )
        print_output(result)

        validation_file = run_dir / "validation.json"
        validation_data = {}
        if validation_file.exists():
            try:
                validation_data = json.loads(validation_file.read_text())
                if validation_data.get("status") == "success":
                    print(
                        f"✅ Validation passed after {validation_data.get('attempts', 1)} attempt(s)"
                    )
                else:
                    print(f"⚠️  Validation had issues: {validation_data.get('message')}")
            except:
                pass
    print()

    # --- SUMMARY ---
    print("=" * 80)
    print("✅ CONVERSION COMPLETE")
    print("=" * 80)
    if test_path:
        print(f"Test file: {test_path}")
    print(f"Artifacts: {run_dir}")
    if validation_data.get("status") == "success":
        print(f"✅ Test validated and passing")
    print()
    if test_path:
        print("To run the test:")
        print(f"  npx playwright test {test_path}")
    print()


if __name__ == "__main__":
    main()
