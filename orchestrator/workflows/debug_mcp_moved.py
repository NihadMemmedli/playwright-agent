
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from load_env import setup_claude_env
from claude_agent_sdk import query, ClaudeAgentOptions

setup_claude_env()

async def test_mcp():
    print("Testing Playwright MCP connection...")
    try:
        # Simple prompt that requires browser
        prompt = "Go to example.com and tell me the title."
        
        async for message in query(
            prompt=prompt,
            options=ClaudeAgentOptions(
                allowed_tools=["*"],
                setting_sources=["project"],
                permission_mode="bypassPermissions"
            )
        ):
            print(f"RAW: {type(message)} {message}")
            if hasattr(message, 'tool_use'):
                print(f"🔧 Tool: {message.tool_use.name}")
            elif hasattr(message, 'message'):
                if hasattr(message.message, 'content'):
                    for block in message.message.content:
                        if hasattr(block, 'text'):
                            print(f"💭 {block.text[:50]}...")
            
        print("✅ Finished")

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_mcp())
