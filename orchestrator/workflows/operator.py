"""
Operator Workflow - Executes test plans using Playwright MCP
"""

import asyncio
import sys
import os
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Tuple
import typing

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

    async def _substitute_env_vars(self, plan: Dict) -> typing.Tuple[Dict, Dict[str, str]]:
        """Recursively substitute {{VAR}} with environment variables in the plan"""
        import re
        
        # Map of secret_value -> {{VAR_NAME}}
        secrets = {}

        def sub_recursive(item):
            if isinstance(item, dict):
                return {k: sub_recursive(v) for k, v in item.items()}
            elif isinstance(item, list):
                return [sub_recursive(i) for i in item]
            elif isinstance(item, str):
                # Find all {{VAR}} patterns
                matches = re.findall(r"\{\{([^}]+)\}\}", item)
                new_val = item
                for var_name in matches:
                    env_val = os.environ.get(var_name)
                    if env_val:
                        placeholder = f"{{{{{var_name}}}}}"
                        new_val = new_val.replace(placeholder, env_val)
                        # Store mapping for scrubbing later
                        secrets[env_val] = placeholder
                    else:
                        print(f"⚠️ WARNING: Environment variable {var_name} not found!")
                return new_val
            else:
                return item

        return sub_recursive(plan), secrets

    def _scrub_secrets(self, data: Any, secrets: Dict[str, str]) -> Any:
        """Recursively replace secret values with placeholders"""
        if not secrets:
            return data

        if isinstance(data, dict):
            return {k: self._scrub_secrets(v, secrets) for k, v in data.items()}
        elif isinstance(data, list):
            return [self._scrub_secrets(i, secrets) for i in data]
        elif isinstance(data, str):
            val = data
            for secret_val, placeholder in secrets.items():
                if secret_val in val:
                    val = val.replace(secret_val, placeholder)
            return val
        else:
            return data

    async def execute_plan(
        self, plan: Dict, run_dir: str = None, interactive: bool = False
    ) -> Dict:
        """
        Execute a test plan using Playwright MCP.

        Args:
            plan: JSON test plan from Planner
            run_dir: Directory to save screenshots and artifacts
            interactive: Whether to ask for confirmation before each step

        Returns:
            Dict containing execution trace
        """
        # Substitute environment variables in the plan
        plan, secrets = await self._substitute_env_vars(plan)

        if interactive:
            return await self._execute_plan_interactive(plan, run_dir)

        print(f"🤖 Executing test: {plan.get('testName', 'Unnamed')}")
        print(f"   Steps to execute: {len(plan.get('steps', []))}")

        # Build the execution prompt
        prompt = self._build_execution_prompt(plan, run_dir)

        # Query the agent with Playwright MCP access
        run = await self._query_agent(prompt)

        # Propagate metadata from plan to run
        if run:
            run["specFileName"] = plan.get("specFileName")
            run["specFilePath"] = plan.get("specFilePath")
            
            # Scrub secrets from the run result before returning
            run = self._scrub_secrets(run, secrets)

        # Validate against schema
        print("✅ Validating run against schema...")
        validate_json_schema(run, self.schema_path)

        # Print summary
        self._print_summary(run)

        if run_dir:
            self._move_artifacts(run_dir)

        return run

    async def _execute_plan_interactive(self, plan: Dict, run_dir: str = None) -> Dict:
        """
        Interactive Mode Wrapper.

        NOTE: True step-by-step execution with "Execute? [y/n]" is currently disabled because
        the browser session resets between steps in the current architecture.

        Instead, we run the full plan after the user has reviewed/edited it in the CLI stage.
        """
        print(
            "ℹ️  Interactive Mode: Step-by-step confirmation is disabled to maintain browser state."
        )
        print("   Running full plan execution...")
        print()

        # Fallback to normal execution to keep browser open
        return await self.execute_plan(plan, run_dir, interactive=False)

    def _build_single_step_prompt(
        self, step: Dict, plan: Dict, run_dir: str = None
    ) -> str:
        """Build prompt for a single step execution"""
        from datetime import datetime, timezone

        start_time = datetime.now(timezone.utc).isoformat()

        prompt = f"""You are a test execution expert. Execute ONLY this specific step using Playwright MCP tools.

STEP TO EXECUTE:
Action: {step.get('action')}
Target: {step.get('target')}
Description: {step.get('description')}
Context: Test "{plan.get('testName')}"

CRITICAL INSTRUCTIONS:
1. Execute ONLY this action.
2. Verify the action succeeded.
3. Output result as JSON.

OUTPUT FORMAT:
```json
{{
  "steps": [
    {{
      "stepNumber": {step.get('stepNumber')},
      "action": "{step.get('action')}",
      "target": "{step.get('target')}",
      "selector": "actual selector used",
      "selectorType": "css/text/role",
      "snapshot": null,
      "result": "success",
      "error": null,
      "screenshot": null,
      "timestamp": "{start_time}",
      "details": "Execution details",
      "description": "{step.get('description')}"
    }}
  ],
  "finalState": "passed",
  "successCount": 1,
  "failureCount": 0
}}
```
"""
        if run_dir:
            prompt += f"\nSave screenshots to current directory."
        return prompt

    def _print_summary(self, run: Dict):
        success_count = run.get("successCount", 0)
        failure_count = run.get("failureCount", 0)
        final_state = run.get("finalState", "unknown")

        print(f"✅ Execution complete: {final_state.upper()}")
        print(f"   ✅ Passed: {success_count}")
        if failure_count > 0:
            print(f"   ❌ Failed: {failure_count}")

    def _move_artifacts(self, run_dir: str):
        import shutil

        for file in os.listdir("."):
            if file.endswith(".png"):
                try:
                    shutil.move(file, os.path.join(run_dir, file))
                    print(f"📦 Moved {file} to {run_dir}")
                except Exception as e:
                    print(f"⚠️ Failed to move {file}: {e}")

    # ... (existing _build_execution_prompt and _query_agent methods remain but need to ensure no overlap) ...
    # Wait, I need to make sure I don't overwrite them if I'm replacing lines.
    # The previous codeblock ended at line 264 (end of file).
    # I should be careful about _build_execution_prompt.
    # I will replace execute_plan and add the new methods, but I need to keep _build_execution_prompt and _query_agent.

    # RE-STRATEGY: Use REPLACE for execute_plan, and ADD the new methods.
    # BUT `execute_plan` calls `_build_execution_prompt` which I need to keep.

    # Let's just append the Helper methods and replace execute_plan.

    # Actually, the file structure in my previous `view_file` output:
    # 44:    async def execute_plan(self, plan: Dict, run_dir: str = None) -> Dict:
    # ...
    # 92:    def _build_execution_prompt(self, plan: Dict, run_dir: str = None) -> str:

    # I will replace `execute_plan` (lines 44-90).
    # And I will inserts the new methods after `_query_agent` (line 192) or at the end of the class.

    # Let's do it in chunks.

    def _build_execution_prompt(self, plan: Dict, run_dir: str = None) -> str:
        """Build the prompt for the agent"""
        from datetime import datetime
        import json

        # Get current timestamp for the agent
        from datetime import timezone

        start_time = datetime.now(timezone.utc).isoformat()

        prompt = f"""You are a test execution expert. Execute this test plan using Playwright MCP tools.

CRITICAL INSTRUCTIONS - MUST FOLLOW:
4. Use `mcp__playwright__browser_evaluate` or `getBy...` for validation.
5. **SELF-CORRECTION**: If a step fails (e.g. timeout, selector not found):
   a. DO NOT FAIL IMMEDIATELY.
   b. Use `mcp__playwright__get_accessibility_tree` or text content to analyze the page.
   c. DETERMINE A FIX (e.g. found button with different ID or text).
   d. RETRY the action with the corrected selector.
   e. Only return failure if 3 attempts fail.
6. Output ONLY valid JSON

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
        run = None
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
                    # Do not break, consume remaining messages to allow clean exit

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
    import argparse

    parser = argparse.ArgumentParser(description="Execute a test plan.")
    parser.add_argument("plan", help="Path to the plan JSON file")
    parser.add_argument(
        "rundir",
        nargs="?",
        default="runs/test_execution",
        help="Directory to save artifacts",
    )
    parser.add_argument(
        "--interactive",
        action="store_true",
        help="Ask for confirmation before each step",
    )

    args = parser.parse_args()

    plan_path = args.plan
    run_dir = Path(args.rundir)
    run_dir.mkdir(parents=True, exist_ok=True)

    try:
        # Load plan
        plan_file = Path(plan_path)
        if not plan_file.exists():
            raise FileNotFoundError(f"Plan file not found: {plan_path}")
        plan = json.loads(plan_file.read_text())

        operator = Operator()
        run = await operator.execute_plan(
            plan, str(run_dir), interactive=args.interactive
        )

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
