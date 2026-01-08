from typing import Dict, Any, List
import asyncio
from .base_agent import BaseAgent
from utils.json_utils import extract_json_from_markdown

class ExploratoryAgent(BaseAgent):
    """
    Agent that autonomously explores a website to find errors.
    """

    async def run(self, config: Dict[str, Any]) -> Dict[str, Any]:
        url = config.get("url")
        instructions = config.get("instructions", "Explore the website and look for errors.")
        max_steps = config.get("max_steps", 10)
        
        print(f"🕵️‍♂️ Starting Exploratory Agent on {url}")

        # Initial prompt to start the session
        prompt = f"""You are an Exploratory Testing Agent.
Target URL: {url}
Instructions: {instructions}
Max Steps: {max_steps}

GOAL: Explore the application, click buttons, fill forms, and navigate. 
Look for:
- Console errors
- 404/500 responses
- Broken layouts
- Visual bugs

CONFIG:
- Use Playwright tools to navigate and interact.
- You have {max_steps} interaction steps allowed.
- Report any issues found immediately in the final report.
- CRITICAL: Do NOT return full HTML or screenshots in your text response. It will crash the connection. Only return concise summaries.

Step 1: Navigate to {url} and analyze the page.

Return a JSON summary of your exploration when done or when max steps reached.
Format:
```json
{{
  "visited_urls": ["..."],
  "actions_performed": [
      {{"step": 1, "action": "click", "target": "Login", "outcome": "success"}}
  ],
  "issues_found": [
      {{"type": "error", "description": "Console error on login page"}}
  ],
  "summary": "Exploration complete."
}}
```
"""
        
        # We perform a single long-running query where the agent can takes multiple steps
        # thanks to the loop in the SDK (auto-tool-use). 
        # However, purely "autonomous" loops might need manual looping if the SDK doesn't auto-loop enough.
        # For now, we rely on the SDK's internal tool loop.
        
        result = await self._query_agent(prompt)
        
        # Parse result
        try:
            data = extract_json_from_markdown(result)
            return data
        except Exception:
            return {
                "summary": "Agent finished but returned non-JSON output.",
                "raw_output": str(result)
            }
