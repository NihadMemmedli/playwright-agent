"""
Validator Workflow - Runs generated tests and fixes failures automatically
"""

import asyncio
import sys
import os
import json
from datetime import datetime
from pathlib import Path
from typing import Dict

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load Claude credentials
from load_env import setup_claude_env

setup_claude_env()

from claude_agent_sdk import query, ClaudeAgentOptions
from utils.json_utils import extract_json_from_markdown


class Validator:
    """Validates and fixes generated Playwright tests"""

    def __init__(self, max_attempts: int = 3):
        self.max_attempts = max_attempts

    async def validate_and_fix(self, test_file: str, output_dir: str = None) -> Dict:
        """
        Run a test and fix any failures automatically.

        Args:
            test_file: Path to the Playwright test file
            output_dir: Directory to save validation results

        Returns:
            Dict containing validation results
        """
        print(f"🔍 Validating test: {test_file}")

        # Read the test file
        test_path = Path(test_file)
        if not test_path.exists():
            raise FileNotFoundError(f"Test file not found: {test_file}")

        test_code = test_path.read_text()
        validation_result = None

        for attempt in range(1, self.max_attempts + 1):
            print(f"\n{'='*80}")
            print(f"Attempt {attempt}/{self.max_attempts}")
            print(f"{'='*80}\n")

            # Run the test
            print("🚀 Running test...")
            result = await self._run_test(test_file)

            if result.get("passed"):
                print("✅ Test passed!")
                validation_result = {
                    "status": "success",
                    "attempts": attempt,
                    "testFile": test_file,
                    "message": "Test passed successfully",
                    "timestamp": datetime.now().isoformat(),
                }
                break

            # Test failed, try to fix it
            print(f"❌ Test failed (exit code: {result.get('exitCode')})")
            print(f"Output:\n{result.get('output')}")

            if attempt < self.max_attempts:
                print(f"\n🔧 Attempting to fix...")
                fix_result = await self._fix_test(
                    test_file, result.get("output"), test_code
                )

                if fix_result.get("status") == "fixed":
                    print("✅ Fix applied, re-running...")
                    test_code = test_path.read_text()  # Read updated code
                else:
                    print(
                        f"⚠️  Could not fix automatically: {fix_result.get('remainingIssues')}"
                    )
                    validation_result = {
                        "status": "failed",
                        "attempts": attempt,
                        "testFile": test_file,
                        "message": "Could not fix automatically",
                        "remainingIssues": fix_result.get("remainingIssues"),
                        "lastError": result.get("output"),
                        "timestamp": datetime.now().isoformat(),
                    }
                    break
        else:
            # All attempts failed
            validation_result = {
                "status": "failed",
                "attempts": self.max_attempts,
                "testFile": test_file,
                "message": f"Failed after {self.max_attempts} attempts",
                "lastError": result.get("output"),
                "timestamp": datetime.now().isoformat(),
            }

        # Save validation result
        if output_dir and validation_result:
            output_path = Path(output_dir)
            output_path.mkdir(parents=True, exist_ok=True)  # Create directory if needed
            validation_file = output_path / "validation.json"
            with open(validation_file, "w") as f:
                json.dump(validation_result, f, indent=2)
            print(f"\n✅ Validation result saved to: {validation_file}")

        return validation_result

    async def _run_test(self, test_file: str) -> Dict:
        """Run a Playwright test and return the result"""
        import subprocess

        try:
            result = subprocess.run(
                f"npx playwright test '{test_file}'",
                shell=True,
                capture_output=True,
                text=True,
                timeout=60,
            )

            output = result.stdout + result.stderr

            # Check if test passed
            passed = result.returncode == 0 and ("passed" in output)

            return {"passed": passed, "exitCode": result.returncode, "output": output}

        except subprocess.TimeoutExpired:
            return {
                "passed": False,
                "exitCode": -1,
                "output": "Test timed out after 60 seconds",
            }
        except Exception as e:
            return {"passed": False, "exitCode": -1, "output": str(e)}

    async def _fix_test(
        self, test_file: str, error_output: str, test_code: str
    ) -> Dict:
        """Use Agent to fix the test based on error output"""
        test_path = Path(test_file)

        prompt = f"""You are a test fixing expert. Fix this failing Playwright test.

CURRENT TEST CODE:
```typescript
{test_code}
```

ERROR OUTPUT:
```
{error_output}
```

INSTRUCTIONS:
1. Analyze the error carefully
2. Use Playwright MCP tools to debug the page if needed
3. Fix the test code by updating selectors, waits, or assertions
4. Write the fixed code back to the test file: {test_file}

COMMON FIXES:
- If "strict mode violation": Use {{ exact: true }} or more specific selector
- If "element not found": Try different selector (getByRole, getByLabel, getByText)
- If "timeout" or "hidden": Add waitForLoadState or increase timeout
- If "multiple elements": Use more specific role name or text

After fixing, output ONLY this JSON (no other text):
```json
{{
  "status": "fixed",
  "originalError": "Brief description of the error",
  "fixApplied": "Description of what was fixed",
  "codeChanges": "Summary of code changes"
}}
```

If you cannot fix it:
```json
{{
  "status": "failed",
  "originalError": "Description",
  "remainingIssues": ["Issue 1", "Issue 2"]
}}
```

Fix the test now.
"""

        try:
            async for message in query(
                prompt=prompt,
                options=ClaudeAgentOptions(
                    allowed_tools=["*"],  # All tools including MCP and Write
                    setting_sources=["project"],
                    permission_mode="bypassPermissions",
                ),
            ):
                if hasattr(message, "result"):
                    result = message.result
                    fix_report = extract_json_from_markdown(result)

                    # Read the updated test code
                    updated_code = test_path.read_text()

                    if updated_code != test_code:
                        print(f"✅ Test file updated")
                        if fix_report.get("status") == "fixed":
                            print(f"   Fix: {fix_report.get('fixApplied')}")

                    return fix_report

        except Exception as e:
            return {
                "status": "failed",
                "originalError": str(e),
                "remainingIssues": ["Validator error: " + str(e)],
            }


# Convenience function
async def validate_from_file(test_file: str) -> Dict:
    """Validate and fix a test file"""
    validator = Validator()
    return await validator.validate_and_fix(test_file)


# Test the validator
async def main():
    """Test the validator with a test file"""
    if len(sys.argv) < 2:
        print("Usage: python validator.py <test-file> [output-dir]")
        sys.exit(1)

    test_file = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) >= 3 else None

    try:
        validator = Validator()
        result = await validator.validate_and_fix(test_file, output_dir)

        print("\n" + "=" * 80)
        print("VALIDATION COMPLETE")
        print("=" * 80)

        if result.get("status") == "success":
            print(f"✅ {result.get('message')}")
            print(f"   Attempts: {result.get('attempts')}")
        else:
            print(f"❌ {result.get('message')}")
            if result.get("lastError"):
                print(f"\nLast error:\n{result.get('lastError')}")

        print()

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
