"""
Exporter Workflow - Converts execution traces to Playwright test code
"""

import asyncio
import sys
import os
import json
from pathlib import Path
from typing import Dict

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load Claude credentials
from load_env import setup_claude_env
setup_claude_env()

from claude_agent_sdk import query, ClaudeAgentOptions
from utils.json_utils import extract_json_from_markdown, validate_json_schema, save_json


class Exporter:
    """Converts test execution traces into Playwright test code"""

    def __init__(self, schema_path: str = "schemas/export.schema.json"):
        self.schema_path = schema_path

    async def export(self, run: Dict, test_dir: str = "tests/generated") -> Dict:
        """
        Convert a run trace to Playwright test code.

        Args:
            run: Execution trace from Operator
            test_dir: Directory to save test files

        Returns:
            Dict containing export result (test path, code, etc.)
        """
        print(f"📤 Generating test code for: {run.get('testName', 'Unnamed')}")
        print(f"   Steps to convert: {len(run.get('steps', []))}")

        # Build the export prompt
        prompt = self._build_export_prompt(run)

        # Query the agent
        export_result = await self._query_agent(prompt)

        # Validate against schema
        print("✅ Validating export against schema...")
        validate_json_schema(export_result, self.schema_path)

        # Determine test file path
        test_path = export_result.get('testFilePath')
        # Remove test_dir prefix if already in the path
        if test_path.startswith(test_dir):
            test_path = test_path
        elif not test_path.startswith('/') and not test_path.startswith('./'):
            test_path = str(Path(test_dir) / test_path)

        # Save the test file
        test_file = Path(test_path)
        test_file.parent.mkdir(parents=True, exist_ok=True)
        test_file.write_text(export_result['code'])

        print(f"✅ Test code generated")
        print(f"   File: {test_path}")
        print(f"   Dependencies: {', '.join(export_result.get('dependencies', []))}")

        if export_result.get('notes'):
            print(f"   Notes:")
            for note in export_result['notes']:
                print(f"     • {note}")

        return export_result

    def _build_export_prompt(self, run: Dict) -> str:
        """Build the prompt for the agent"""
        import json

        prompt = """You are a test code generation expert. Convert this test execution trace into production-ready Playwright test code in TypeScript.

CRITICAL INSTRUCTIONS:
1. Follow Playwright best practices
2. Use role-based selectors (getByRole, getByLabel, getByText)
3. Group related steps with test.step()
4. Add helpful comments
5. Output ONLY valid JSON in a ```json code block

EXECUTION TRACE:
```json
""" + json.dumps(run, indent=2) + """
```

CODE STYLE REQUIREMENTS:
- Use async/await properly
- Use getByRole() for buttons, links, headings
- Use getByLabel() for form inputs
- Use getByText() for text content
- Add proper assertions with expect()
- Group steps with test.step() when logical
- Make code readable and maintainable

OUTPUT FORMAT:
```json
{
  "testFilePath": "tests/generated/test-name.spec.ts",
  "code": "import { test, expect } from '@playwright/test';\\n\\ntest.describe(...",
  "dependencies": ["@playwright/test"],
  "notes": ["Brief note about the code"]
}
```

SELECTOR MAPPING:
- **CRITICAL**: If the execution trace has a "selector" field, USE IT EXACTLY. Do not invent a new one.
- Navigate: page.goto('URL')
- Manual Fallback (only if selector missing):
  - Button: page.getByRole('button', { name: '...' })
  - Field: page.getByLabel('...')
  - Text: page.getByText('...')

Now convert the execution trace to Playwright code and return the result as JSON. No other text.
"""

        return prompt

    async def _query_agent(self, prompt: str) -> Dict:
        """Query the agent"""
        try:
            async for message in query(
                prompt=prompt,
                options=ClaudeAgentOptions(
                    allowed_tools=["Write"],
                    setting_sources=["project"]
                )
            ):
                if hasattr(message, 'result'):
                    result = message.result
                    # Extract JSON from markdown
                    export_data = extract_json_from_markdown(result)
                    return export_data

        except Exception as e:
            error_msg = str(e)
            if "cancel scope" not in error_msg.lower():
                raise RuntimeError(f"Failed to export test: {e}")


# Convenience function for testing
async def export_from_file(run_path: str, test_dir: str = "tests/generated") -> Dict:
    """
    Export a test from a run trace file.

    Args:
        run_path: Path to the run JSON file
        test_dir: Directory to save test files

    Returns:
        Export result
    """
    exporter = Exporter()

    run_file = Path(run_path)
    if not run_file.exists():
        raise FileNotFoundError(f"Run file not found: {run_path}")

    run = json.loads(run_file.read_text())

    return await exporter.export(run, test_dir)


# Test the exporter
async def main():
    """Test the exporter with a real run"""
    if len(sys.argv) < 2:
        print("Usage: python exporter.py <run.json>")
        sys.exit(1)

    run_path = sys.argv[1]

    try:
        export_result = await export_from_file(run_path)

        # Save export metadata
        export_file = Path(run_path).parent / "export.json"
        save_json(export_result, str(export_file))

        print(f"\n✅ Export metadata saved to: {export_file}")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
