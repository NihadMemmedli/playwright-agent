from typing import Dict, Any
from .base_agent import BaseAgent
from utils.json_utils import extract_json_from_markdown

class SpecWriterAgent(BaseAgent):
    """
    Agent that generates a Playwright Test Spec (markdown) from a URL.
    """

    async def run(self, config: Dict[str, Any]) -> Dict[str, Any]:
        url = config.get("url")
        instructions = config.get("instructions", "Generate a test spec for the main feature of this page.")
        
        print(f"✍️ Starting Spec Writer Agent on {url}")

        prompt = f"""You are a Test Specification Writer.
Target URL: {url}
Instructions: {instructions}

GOAL: 
1. Navigate to the URL.
2. Understand the page's purpose.
3. Generate a high-quality Markdown Test Specification (like the examples in specs/ directory).

REQUIREMENTS:
- The spec must use standard steps: Navigate, Click, Fill, Assert.
- Use placeholders `{{{{VAR_NAME}}}}` for secrets (like passwords).
- Structure:
  # Test: [Title]
  ## Description
  ...
  ## Steps
  1. ...
  2. ...

Step 1: Navigate to {url} to understand the page.
Step 2: Generate the markdown spec.

Return the result as JSON:
```json
{{
  "spec_title": "...",
  "spec_content": "# Test: ... (full markdown content)...",
  "summary": "Generated spec for login page."
}}
```
"""

        result = await self._query_agent(prompt)

        try:
            data = extract_json_from_markdown(result)
            return data
        except Exception:
             # If agent just returned markdown, wrap it
            return {
                "spec_content": str(result),
                "summary": "Agent returned raw content."
            }
