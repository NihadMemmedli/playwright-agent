"""
Debug script to see what the agent actually produces
"""

import asyncio
import sys
import os
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from claude_agent_sdk import query, ClaudeAgentOptions


async def test_planner_output():
    """Test what the agent actually outputs"""

    spec_content = Path("../specs/01_simple_navigation.md").read_text()

    prompt = f"""Convert this test spec to JSON. Output ONLY the JSON in a ```json code block.

{spec_content}
"""

    print("Sending prompt to agent...")
    print("=" * 80)

    async for message in query(
        prompt=prompt,
        options=ClaudeAgentOptions(
            allowed_tools=["Read"],
            setting_sources=["project"]
        )
    ):
        if hasattr(message, 'result'):
            print("AGENT OUTPUT:")
            print("=" * 80)
            print(message.result)
            print("=" * 80)

            # Save to file
            Path("raw_agent_output.txt").write_text(message.result)
            print("\nSaved to: raw_agent_output.txt")


if __name__ == "__main__":
    asyncio.run(test_planner_output())
