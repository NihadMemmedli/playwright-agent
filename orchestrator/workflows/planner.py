"""
Planner Workflow - Converts test specs to structured JSON plans
"""

import asyncio
import sys
import os
from pathlib import Path
from typing import Dict

# Add utils to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load Claude credentials
from load_env import setup_claude_env
setup_claude_env()

from claude_agent_sdk import query, ClaudeAgentOptions
from utils.json_utils import extract_json_from_markdown, validate_json_schema


class Planner:
    """Converts natural language test specifications into structured JSON plans"""

    def __init__(self, schema_path: str = "schemas/plan.schema.json"):
        self.schema_path = schema_path

    async def create_plan(self, spec_content: str, spec_path: str = None) -> Dict:
        """
        Convert a test specification to a structured JSON plan.

        Args:
            spec_content: The markdown specification content
            spec_path: Optional path to the spec file (for context)

        Returns:
            Dict containing the structured test plan
        """
        print("📋 Creating test plan from specification...")

        # Build the prompt with JSON formatting requirements
        prompt = self._build_prompt(spec_content, spec_path)

        # Query the agent
        plan = await self._query_agent(prompt)

        # Validate against schema
        print("✅ Validating plan against schema...")
        validate_json_schema(plan, self.schema_path)

        print(f"✅ Plan created: {plan.get('testName', 'Unnamed')}")
        print(f"   Steps: {len(plan.get('steps', []))}")

        return plan

    def _build_prompt(self, spec_content: str, spec_path: str = None) -> str:
        """Build the prompt for the agent"""
        prompt = """You are a test planning expert. Convert this test specification into a structured JSON plan.

CRITICAL: Output ONLY valid JSON. No explanations, no markdown formatting outside the code block.

OUTPUT FORMAT (copy this structure):
```json
{
  "testName": "Test name",
  "description": "What it tests",
  "baseUrl": "URL",
  "steps": [
    {
      "stepNumber": 1,
      "action": "navigate",
      "target": "https://example.com",
      "description": "Go to example.com"
    },
    {
      "stepNumber": 2,
      "action": "assert",
      "target": "Example Domain",
      "assertion": {"type": "visible", "expected": true},
      "description": "Verify heading visible"
    }
  ]
}
```

RULES:
1. For "navigate" actions: target = URL string
2. For "click"/"fill" actions: target = simple string describing the element (e.g., "Login button", "Email field")
3. For "assert" actions: target = text/element to check
4. Keep it SIMPLE - don't overcomplicate selectors
5. Number steps starting from 1

ACTION TYPES: navigate, click, fill, assert, screenshot
ASSERTION TYPES: visible, text

Now convert this specification to JSON:

"""
        if spec_path:
            prompt += f"\n# Spec File: {spec_path}\n\n"

        prompt += spec_content

        prompt += "\n\nOutput ONLY the JSON in a code block. No other text."

        return prompt

    async def _query_agent(self, prompt: str) -> Dict:
        """Query the agent and extract JSON"""
        try:
            async for message in query(
                prompt=prompt,
                options=ClaudeAgentOptions(
                    allowed_tools=["Read"],
                    setting_sources=["project"]  # Enable .claude/ config
                )
            ):
                if hasattr(message, 'result'):
                    result = message.result
                    # Extract JSON from markdown
                    plan = extract_json_from_markdown(result)
                    return plan

        except Exception as e:
            raise RuntimeError(f"Failed to query agent for planning: {e}")


# Convenience function for testing
async def plan_from_file(spec_path: str) -> Dict:
    """
    Create a plan from a spec file.

    Args:
        spec_path: Path to the markdown spec file

    Returns:
        Structured test plan
    """
    planner = Planner()

    spec_file = Path(spec_path)
    if not spec_file.exists():
        raise FileNotFoundError(f"Spec file not found: {spec_path}")

    spec_content = spec_file.read_text()

    return await planner.create_plan(spec_content, str(spec_file))


# Test the planner
async def main():
    """Test the planner with a real spec"""
    if len(sys.argv) < 2:
        print("Usage: python planner.py <spec-file>")
        sys.exit(1)

    spec_path = sys.argv[1]

    try:
        plan = await plan_from_file(spec_path)

        # Save the plan
        output_file = Path("runs/test_plan.json")
        output_file.parent.mkdir(parents=True, exist_ok=True)

        import json
        with open(output_file, 'w') as f:
            json.dump(plan, f, indent=2)

        print(f"\n✅ Plan saved to: {output_file}")
        print(f"\nPlan preview:")
        print(json.dumps(plan, indent=2))

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
