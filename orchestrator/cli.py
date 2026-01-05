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

def run_command(command: str, stream_output: bool = False, interactive: bool = False) -> subprocess.CompletedProcess:
    """
    Run a shell command using the current python executable.
    
    Args:
        command: The python command string (without 'python')
        stream_output: Whether to print stdout in real-time
        interactive: Whether to attach stdin/stdout for user interaction
        
    Returns:
        CompletedProcess object
    """
    # Use the same python interpreter that launch this CLI
    python_exe = sys.executable
    full_cmd = f"\"{python_exe}\" {command}"
    
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
            bufsize=1 
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
        
        result = subprocess.CompletedProcess(args=full_cmd, returncode=return_code)
        result.stdout = "".join(stdout_lines)
        result.stderr = stderr
        return result
    else:
        return subprocess.run(
            full_cmd,
            shell=True,
            capture_output=True,
            text=True
        )

def print_output(result: subprocess.CompletedProcess):
    """Print stdout and safe stderr from process result."""
    if result.stderr and "cancel scope" not in result.stderr:
        print(f"STDERR: {result.stderr}", file=sys.stderr)

def main():
    parser = argparse.ArgumentParser(description="Convert natural language test specs to Playwright code.")
    parser.add_argument("spec", help="Path to the markdown specification file")
    parser.add_argument("--interactive", "-i", action="store_true", help="Enable interactive mode (plan review and step confirmation)")
    
    args = parser.parse_args()
    spec_path = args.spec
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
    # Invoke inner modules using -m to ensure package resolution works
    result = run_command(f"-m orchestrator.workflows.planner '{spec_path}'")
    print_output(result)

    plan_src = Path("runs/test_plan.json")
    if plan_src.exists():
        shutil.move(plan_src, run_dir / "plan.json")
        print(f"✅ Plan saved to: {run_dir / 'plan.json'}")
    else:
        print("❌ Plan not found")
        if result.stdout: print(result.stdout)
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
            
            if choice == 'q':
                sys.exit(0)
            elif choice == 'e':
                print(f"✏️  Edit the file at: {run_dir / 'plan.json'}")
                input("Press Enter when done editing...")
                # Reload plan to check validity (optional, but good practice)
                try:
                    plan = json.loads((run_dir / "plan.json").read_text())
                    print("✅ Plan reloaded.")
                except Exception as e:
                    print(f"❌ Invalid JSON: {e}")
                    continue
            elif choice == 'c':
                break

    # --- STAGE 2: EXECUTE ---
    print("🤖 Stage 2: Executing test plan...")
    
    # Construct Operator command
    cmd = f"-u -m orchestrator.workflows.operator '{run_dir / 'plan.json'}' '{run_dir}'"
    if args.interactive:
        cmd += " --interactive"
        
    result = run_command(
        cmd,
        stream_output=True,
        interactive=args.interactive 
    )
    if not args.interactive:
        print_output(result)

    run_file = run_dir / "run.json"
    if run_file.exists():
        print(f"✅ Run saved to: {run_file}")
        try:
            run = json.loads(run_file.read_text())
            print(f"   Final state: {run.get('finalState')}")
            print(f"   Duration: {run.get('duration', 0):.1f}s")
        except: pass
    else:
        print("❌ Run not found")
        sys.exit(1)
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
            test_path = export_data.get('testFilePath')
            print(f"   Test file: {test_path}")
        except: test_path = None
    else:
        print("❌ Export not found")
        if result.stdout: print(result.stdout)
        sys.exit(1)
    print()

    # --- STAGE 4: VALIDATE ---
    if test_path:
        print("🔍 Stage 4: Validating generated test...")
        result = run_command(f"-m orchestrator.workflows.validator '{test_path}' '{run_dir}'")
        print_output(result)
        
        validation_file = run_dir / "validation.json"
        validation_data = {}
        if validation_file.exists():
            try:
                validation_data = json.loads(validation_file.read_text())
                if validation_data.get('status') == 'success':
                    print(f"✅ Validation passed after {validation_data.get('attempts', 1)} attempt(s)")
                else:
                    print(f"⚠️  Validation had issues: {validation_data.get('message')}")
            except: pass
    print()

    # --- SUMMARY ---
    print("=" * 80)
    print("✅ CONVERSION COMPLETE")
    print("=" * 80)
    if test_path:
        print(f"Test file: {test_path}")
    print(f"Artifacts: {run_dir}")
    if validation_data.get('status') == 'success':
        print(f"✅ Test validated and passing")
    print()
    if test_path:
        print("To run the test:")
        print(f"  npx playwright test {test_path}")
    print()

if __name__ == "__main__":
    main()
