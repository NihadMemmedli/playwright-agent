from typing import Dict, Any, List, Optional
import asyncio
from datetime import datetime
import json
import os

from claude_agent_sdk import query, ClaudeAgentOptions
from ..utils.json_utils import extract_json_from_markdown
from ..load_env import setup_claude_env

class BaseAgent:
    """Base class for autonomous agents"""

    def __init__(self):
        # Allow agents to use project settings
        setup_claude_env()

    async def _query_agent(self, prompt: str, system_prompt: str = None, timeout_seconds: int = None) -> Any:
        """Query the agent with Playwright tools enabled

        Args:
            prompt: The prompt to send to the agent
            system_prompt: Optional system prompt
            timeout_seconds: Optional timeout in seconds (None = no timeout)
        """
        async def _do_query():
            try:
                options = ClaudeAgentOptions(
                    allowed_tools=["*"],  # Allow all tools (Playwright, etc)
                    setting_sources=["project"],
                    permission_mode="bypassPermissions",
                )

                # Note: SDK currently doesn't support separate system_prompt in options easily
                # without constructing messages manually, so we prepend it to prompt if needed.
                full_prompt = prompt
                if system_prompt:
                    full_prompt = f"{system_prompt}\n\n{prompt}"

                response_text = ""
                async for message in query(prompt=full_prompt, options=options):
                     if hasattr(message, "result"):
                        return message.result
                     if hasattr(message, "content"):
                         # Accumulate partial content if needed, though usually result is final
                         pass

                return response_text

            except Exception as e:
                print(f"Agent Query Error: {e}")
                raise e

        # Apply timeout if specified
        if timeout_seconds:
            try:
                return await asyncio.wait_for(_do_query(), timeout=timeout_seconds)
            except asyncio.TimeoutError:
                print(f"Agent query timed out after {timeout_seconds} seconds")
                raise

        return await _do_query()

    async def run(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Main execution method to be implemented by subclasses"""
        raise NotImplementedError
