"""
Operator Workflow - Executes test plans using Playwright MCP
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

# MONKEYPATCH: Increase buffer size limit for Playwright snapshots
# The default is 1MB, which is too small for large pages/tables.
try:
    import claude_agent_sdk._internal.transport.subprocess_cli

    # Set to 50MB
    claude_agent_sdk._internal.transport.subprocess_cli._DEFAULT_MAX_BUFFER_SIZE = (
        50 * 1024 * 1024
    )
except ImportError:
    print("WARNING: Could not monkeypatch SDK buffer size via _internal")
except Exception as e:
    print(f"WARNING: Monkeypatch failed: {e}")

from claude_agent_sdk import query, ClaudeAgentOptions
from utils.json_utils import extract_json_from_markdown, validate_json_schema


class Operator:
    """Executes test plans using Playwright MCP and records results"""

    def __init__(self, schema_path: str = "schemas/run.schema.json"):
        self.schema_path = schema_path

    async def execute_plan(self, plan: Dict, run_dir: str = None) -> Dict:
        """
        Execute a test plan using Playwright MCP.

        Args:
            plan: JSON test plan from Planner
            run_dir: Directory to save screenshots and artifacts

        Returns:
            Dict containing execution trace
        """
        print(f"🤖 Executing test: {plan.get('testName', 'Unnamed')}")
        print(f"   Steps to execute: {len(plan.get('steps', []))}")

        # Build the execution prompt
        prompt = self._build_execution_prompt(plan, run_dir)

        # Query the agent with Playwright MCP access
        run = await self._query_agent(prompt)

        # Validate against schema
        print("✅ Validating run against schema...")
        validate_json_schema(run, self.schema_path)

        # Print summary
        success_count = run.get("successCount", 0)
        failure_count = run.get("failureCount", 0)
        final_state = run.get("finalState", "unknown")

        print(f"✅ Execution complete: {final_state.upper()}")
        print(f"   ✅ Passed: {success_count}")
        if failure_count > 0:
            print(f"   ❌ Failed: {failure_count}")

        if run_dir:
            # Move any generated screenshots from CWD to run_dir
            import shutil

            for file in os.listdir("."):
                if file.endswith(".png"):
                    try:
                        shutil.move(file, os.path.join(run_dir, file))
                        print(f"📦 Moved {file} to {run_dir}")
                    except Exception as e:
                        print(f"⚠️ Failed to move {file}: {e}")

        return run

    def _build_execution_prompt(self, plan: Dict, run_dir: str = None) -> str:
        """Build the prompt for the agent"""
        from datetime import datetime
        import json

        # Get current timestamp for the agent
        start_time = datetime.utcnow().isoformat() + "Z"

        prompt = f"""You are a test execution expert. Execute this test plan using Playwright MCP tools.

CRITICAL INSTRUCTIONS - MUST FOLLOW:
1. Execute the steps IN ORDER
2. **FORBIDDEN TOOL**: `mcp__playwright__browser_snapshot`. DO NOT USE IT. It causes crashes.
3. Use `mcp__playwright__browser_take_screenshot` for screenshots.
4. Use `mcp__playwright__browser_evaluate` or `getBy...` for validation.
5. Output ONLY valid JSON

TEST PLAN:
```json
{json.dumps(plan, indent=2)}
```

EXECUTION REQUIREMENTS:
- Start time: {start_time}
- Use Playwright MCP tools
- **WARNING**: Do NOT use full page snapshots or trees.
- Set ALL snapshot fields to null
- Keep ALL details under 10 words
- Include timestamps (ISO format)

OUTPUT FORMAT (COPY THIS STRUCTURE):
```json
{{
  "testName": "{plan.get('testName', 'Test')}",
  "startTime": "{start_time}",
  "endTime": "2025-01-02T12:01:00Z",
  "duration": 60.0,
  "steps": [
    {{
      "stepNumber": 1,
      "action": "navigate",
      "target": "URL or element",
      "selector": "page.getByRole('button', {{name: 'Submit'}})",
      "selectorType": "role",
      "snapshot": null,
      "result": "success",
      "error": null,
      "screenshot": null,
      "timestamp": "2025-01-02T12:00:10Z",
      "details": "Brief description",
      "description": "Step description"
    }}
  ],
  "finalState": "passed",
  "summary": "Brief summary",
  "successCount": 5,
  "failureCount": 0
}}
```

MUST DO:
- **CRITICAL**: For every interaction, record the EXACT selector you used in the "selector" field
- **CRITICAL**: Set "selectorType" to the method used (role, text, label, etc)
- Keep snapshot field NULL for ALL steps
- Keep details field under 10 words
- Total JSON output under 50KB
- NO accessibility trees in output
- Execute steps now and return ONLY the JSON
"""

        if run_dir:
            # DO NOT pass path to agent to avoid buffer overflow/scanning
            prompt += f"\n\nSave any screenshots to the CURRENT WORKING DIRECTORY (e.g. screenshot_1.png). Do not use subfolders."
        return prompt

    async def _query_agent(self, prompt: str) -> Dict:
        """Query the agent with Playwright MCP access"""
        try:
            async for message in query(
                prompt=prompt,
                options=ClaudeAgentOptions(
                    allowed_tools=["*"],  # All tools including MCP
                    setting_sources=["project"],  # Enable .claude/ and .mcp.json
                    permission_mode="bypassPermissions",  # Auto-approve tools
                ),
            ):
                if hasattr(message, "result"):
                    result = message.result
                    # Extract JSON from markdown
                    run = extract_json_from_markdown(result)
                    return run

        except Exception as e:
            # Clean up the traceback for cleaner output
            error_msg = str(e)
            if "cancel scope" in error_msg.lower():
                # This is the known SDK cleanup issue, ignore it
                pass
            else:
                raise RuntimeError(f"Failed to execute plan: {e}")


# Convenience function for testing
async def execute_from_file(plan_path: str, run_dir: str = None) -> Dict:
    """
    Execute a plan from a JSON file.

    Args:
        plan_path: Path to the JSON plan file
        run_dir: Directory to save artifacts

    Returns:
        Execution trace
    """
    operator = Operator()

    plan_file = Path(plan_path)
    if not plan_file.exists():
        raise FileNotFoundError(f"Plan file not found: {plan_path}")

    plan = json.loads(plan_file.read_text())

    return await operator.execute_plan(plan, run_dir)


# Test the operator
async def main():
    """Test the operator with a real plan"""
    if len(sys.argv) < 2:
        print("Usage: python operator.py <plan.json> [run_dir]")
        sys.exit(1)

    plan_path = sys.argv[1]

    # Create run directory - use provided dir or default
    if len(sys.argv) >= 3:
        run_dir = Path(sys.argv[2])
    else:
        run_dir = Path("runs/test_execution")
    run_dir.mkdir(parents=True, exist_ok=True)

    try:
        run = await execute_from_file(plan_path, str(run_dir))

        # Save the run
        output_file = run_dir / "run.json"
        with open(output_file, "w") as f:
            json.dump(run, f, indent=2)

        print(f"\n✅ Run saved to: {output_file}")
        print(f"\nRun summary:")
        print(f"   Final State: {run.get('finalState')}")
        print(f"   Duration: {run.get('duration', 0):.1f}s")
        print(f"   Summary: {run.get('summary')}")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as e:
        # Ignore known SDK cleanup errors
        if "cancel scope" in str(e).lower() or "Cancelled via cancel scope" in str(e):
            pass
        else:
            raise
