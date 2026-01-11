"""
Spec Synthesis Agent

Takes exploration results from the Enhanced ExploratoryAgent
and synthesizes them into production-ready .md test specs
that work with the existing 5-stage pipeline.
"""

from typing import Dict, Any, List, Optional
import re
from pathlib import Path
from datetime import datetime
from .base_agent import BaseAgent
from ..utils.json_utils import extract_json_from_markdown


class SpecSynthesisAgent(BaseAgent):
    """
    Synthesizes exploration results into .md test specs.

    Process:
    1. Analyze exploration results
    2. Identify distinct user flows
    3. Group discoveries by feature/risk
    4. Generate .md specs (happy path + edge cases)
    5. Output specs in existing format
    """

    async def run(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Synthesize exploration results into .md specs.

        Config:
        - exploration_results: Results from ExploratoryAgent
        - url: Base URL of explored application
        - output_dir: Directory to save specs (optional)
        """
        exploration_results = config.get("exploration_results")
        base_url = config.get("url", "")
        output_dir = Path(config.get("output_dir", "specs/generated"))
        output_dir.mkdir(parents=True, exist_ok=True)

        if not exploration_results:
            return {
                "summary": "No exploration results provided",
                "error": "exploration_results is required"
            }

        print(f"✍️ Starting Spec Synthesis Agent")
        print(f"   Discovered flows: {len(exploration_results.get('discovered_flows', []))}")
        print(f"   Output directory: {output_dir}")

        # Analyze and synthesize
        synthesis_result = await self._synthesize_specs(
            exploration_results,
            base_url,
            output_dir
        )

        return synthesis_result

    async def _synthesize_specs(
        self,
        exploration_results: Dict[str, Any],
        base_url: str,
        output_dir: Path
    ) -> Dict[str, Any]:
        """
        Synthesize specs from exploration results.

        This can be done via:
        1. Direct generation (Python logic)
        2. Agent-assisted generation (AI-powered)

        We'll use agent-assisted for better quality.
        """
        # Build synthesis prompt
        prompt = self._build_synthesis_prompt(exploration_results, base_url)

        # Query agent
        result = await self._query_agent(prompt)

        # Parse and save specs
        try:
            data = extract_json_from_markdown(result)

            # Save specs to files
            saved_specs = {}
            for category, files in data.get("specs", {}).items():
                saved_specs[category] = {}
                for filename, content in files.items():
                    filepath = output_dir / filename
                    filepath.write_text(content)
                    saved_specs[category][filename] = str(filepath)

            return {
                "summary": data.get("summary", "Spec synthesis complete"),
                "specs": saved_specs,
                "total_specs": sum(len(v) for v in saved_specs.values()),
                "flows_covered": data.get("flows_covered", []),
                "exploration_url": base_url,
                "generated_at": datetime.now().isoformat()
            }

        except Exception as e:
            # Fallback: generate specs directly
            return await self._generate_specs_directly(
                exploration_results,
                base_url,
                output_dir
            )

    async def _generate_specs_directly(
        self,
        exploration_results: Dict[str, Any],
        base_url: str,
        output_dir: Path
    ) -> Dict[str, Any]:
        """
        Direct spec generation (fallback without agent).

        Generates specs based on exploration results using Python logic.
        """
        discovered_flows = exploration_results.get("discovered_flows", [])
        action_trace = exploration_results.get("action_trace", [])

        specs = {
            "happy_path": {},
            "edge_cases": {}
        }

        flows_covered = []

        # Generate specs for each discovered flow
        for flow in discovered_flows:
            flow_name = flow.get("name", "Unknown Flow")
            flows_covered.append(flow_name)

            # Sanitize filename
            safe_name = self._sanitize_filename(flow_name)

            # Happy path spec
            happy_spec = self._generate_happy_path_spec(flow, base_url, action_trace)
            happy_filename = f"{safe_name}_happy_path.md"
            specs["happy_path"][happy_filename] = happy_spec

            # Edge cases spec
            edge_cases = flow.get("edge_cases", [])
            if edge_cases:
                edge_spec = self._generate_edge_cases_spec(flow, base_url, action_trace)
                edge_filename = f"{safe_name}_edge_cases.md"
                specs["edge_cases"][edge_filename] = edge_spec

        # Save specs
        saved_specs = {}
        for category, files in specs.items():
            saved_specs[category] = {}
            for filename, content in files.items():
                filepath = output_dir / filename
                filepath.write_text(content)
                saved_specs[category][filename] = str(filepath)

        return {
            "summary": f"Generated {len(saved_specs.get('happy_path', {}))} happy path specs and {len(saved_specs.get('edge_cases', {}))} edge case specs",
            "specs": saved_specs,
            "total_specs": sum(len(v) for v in saved_specs.values()),
            "flows_covered": flows_covered,
            "exploration_url": base_url,
            "generated_at": datetime.now().isoformat()
        }

    def _generate_happy_path_spec(self, flow: Dict[str, Any], base_url: str, action_trace: List[Dict]) -> str:
        """Generate a happy path spec for a flow."""
        flow_name = flow.get("name", "Unknown Flow")
        pages = flow.get("pages", [])
        steps = flow.get("steps", [])
        happy_path = flow.get("happy_path", "")

        # Build steps from trace
        spec_steps = []
        spec_steps.append(f"1. Navigate to {base_url}")

        if steps:
            for i, step in enumerate(steps, 2):
                spec_steps.append(f"{i}. {step}")
        else:
            # Generate from pages
            for i, page in enumerate(pages, 2):
                spec_steps.append(f"{i}. Navigate to {page}")

        spec_steps.append(f"{len(spec_steps) + 1}. Verify successful completion")

        return f"""# Test: {flow_name} - Happy Path

## Description
Tests the successful completion of the {flow_name} flow.

{happy_path if happy_path else f'This test verifies that users can successfully complete the {flow_name} flow.'}

## Steps
{chr(10).join(spec_steps)}

## Expected Outcome
- User successfully completes the {flow_name}
- All pages load correctly
- No errors are displayed
- User is redirected to the expected success page

## Test Data
- URL: {base_url}
"""

    def _generate_edge_cases_spec(self, flow: Dict[str, Any], base_url: str, action_trace: List[Dict]) -> str:
        """Generate an edge cases spec for a flow."""
        flow_name = flow.get("name", "Unknown Flow")
        edge_cases = flow.get("edge_cases", [])

        if not edge_cases:
            edge_cases = [
                "Empty fields",
                "Invalid input format",
                "Special characters",
                "Boundary values"
            ]

        # Build test scenarios
        scenarios = []
        for i, case in enumerate(edge_cases, 1):
            scenarios.append(f"""
### Scenario {i}: {case}

**Steps:**
1. Navigate to {base_url}
2. Start the {flow_name} flow
3. {case} - enter test data
4. Attempt to proceed

**Expected Outcome:**
- Appropriate validation error is shown OR
- Field is highlighted as invalid OR
- User is prevented from proceeding with invalid data
""")

        return f"""# Test: {flow_name} - Edge Cases

## Description
Tests edge cases and validation for the {flow_name} flow.

## Scenarios
{"".join(scenarios)}

## Test Data
- Valid test data for comparison
- Invalid data formats (empty, special chars, boundary values)
- URL: {base_url}

## Expected Outcome
- All edge cases are properly validated
- Clear error messages are displayed
- Invalid data cannot be submitted
"""

    def _build_synthesis_prompt(self, exploration_results: Dict[str, Any], base_url: str) -> str:
        """Build the synthesis prompt for the agent."""
        discovered_flows = exploration_results.get("discovered_flows", [])
        action_trace = exploration_results.get("action_trace", [])
        happy_paths = exploration_results.get("happy_paths_found", [])
        edge_cases = exploration_results.get("edge_cases_found", [])

        flows_section = ""
        if discovered_flows:
            flows_section = "DISCOVERED FLOWS:\n"
            for flow in discovered_flows:
                flows_section += f"\n- {flow.get('name', 'Unnamed')}: {flow.get('happy_path', 'No description')}"
                if flow.get('pages'):
                    flows_section += f"\n  Pages: {' → '.join(flow['pages'])}"
                if flow.get('edge_cases'):
                    flows_section += f"\n  Edge Cases: {', '.join(flow['edge_cases'])}"
            flows_section += "\n"

        trace_section = ""
        if action_trace:
            trace_section = "\nACTION TRACE (sample):\n"
            for action in action_trace[:15]:
                trace_section += f"- [{action.get('step', '?')}] {action.get('action', 'unknown')} {action.get('target', 'N/A')}: {action.get('outcome', 'N/A')}\n"
            if len(action_trace) > 15:
                trace_section += f"... and {len(action_trace) - 15} more actions\n"

        return f"""You are a Test Specification Synthesis Agent.

You have been given exploration results from an autonomous testing agent that explored {base_url}.

{flows_section}
{trace_section}

HAPPY PATHS FOUND: {', '.join(happy_paths) if happy_paths else 'None'}
EDGE CASES FOUND: {', '.join(edge_cases) if edge_cases else 'None'}

YOUR TASK:
Generate COMPREHENSIVE .md test specs for all discovered flows.

REQUIREMENTS:
1. Create SEPARATE specs for:
   - HAPPY PATH tests: Each major user flow working correctly
   - EDGE CASE tests: Boundary conditions, negative scenarios

2. Each spec must follow this EXACT format:
   ```markdown
   # Test: [Feature Name] - [Happy Path / Edge Cases]

   ## Description
   [Brief description of what this tests]

   ## Steps
   1. Navigate to [URL]
   2. Click [element]
   3. Fill [field] with [value]
   4. Assert [expected outcome]

   ## Expected Outcome
   - [Expected result 1]
   - [Expected result 2]

   ## Test Data
   - [Any test data requirements]
   ```

3. IMPORTANT:
   - Focus on MULTI-PAGE flows (not single page tests)
   - Use standard step format: Navigate, Click, Fill, Assert, Select, Check
   - Use placeholders `{{{{VAR_NAME}}}}` for secrets/passwords
   - Include specific URLs and element descriptions
   - Make specs actionable and clear

4. For happy paths: Test the complete successful user journey
5. For edge cases: Test boundary values, empty fields, invalid inputs, etc.

OUTPUT FORMAT (return ONLY JSON):
```json
{{
  "specs": {{
    "happy_path": {{
      "checkout_happy_path.md": "# Test: Checkout - Happy Path\\n\\n## Description\\n...",
      "user_registration.md": "# Test: User Registration\\n\\n..."
    }},
    "edge_cases": {{
      "checkout_edge_cases.md": "# Test: Checkout - Edge Cases\\n\\n...",
      "form_validation.md": "# Test: Form Validation\\n\\n..."
    }}
  }},
  "summary": "Generated X happy path specs and Y edge case specs",
  "flows_covered": ["Flow 1", "Flow 2"],
  "total_specs": 0
}}
```

Now generate the specs based on the exploration results above."""

    def _sanitize_filename(self, name: str) -> str:
        """Sanitize a string for use as a filename."""
        # Remove special characters, replace spaces with underscores
        name = re.sub(r'[^\w\s-]', '', name)
        name = re.sub(r'[-\s]+', '_', name)
        return name.lower().strip('_')

    def _infer_test_ideas(self, exploration_results: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Infer additional test ideas from exploration results.

        Analyzes what was tested and suggests what wasn't tested.
        """
        ideas = []

        discovered_flows = exploration_results.get("discovered_flows", [])
        action_trace = exploration_results.get("action_trace", [])

        # Check for common untested scenarios
        tested_urls = set()
        for action in action_trace:
            target = action.get("target", "")
            if "navigate" in target.lower() or "url" in target.lower():
                tested_urls.add(target)

        # Ideas based on coverage gaps
        ideas.append({
            "category": "coverage",
            "idea": "Test all navigation items",
            "priority": "medium",
            "rationale": "Ensure all menu items and links work"
        })

        ideas.append({
            "category": "error_handling",
            "idea": "Test error states and validation",
            "priority": "high",
            "rationale": "Verify proper error messages and validation"
        })

        return ideas
