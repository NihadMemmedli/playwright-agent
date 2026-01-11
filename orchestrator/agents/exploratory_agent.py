from typing import Dict, Any, List, Set, Optional
import asyncio
import time
import json
import os
from datetime import datetime
from dataclasses import dataclass, field
from pathlib import Path
from .base_agent import BaseAgent
from ..utils.json_utils import extract_json_from_markdown


@dataclass
class Observation:
    """A single observation during exploration."""
    step_number: int
    action: str
    target: str
    outcome: str
    timestamp: float
    screenshot_path: Optional[str] = None
    console_errors: List[str] = field(default_factory=list)
    interest_score: float = 0.0
    is_new_discovery: bool = False


@dataclass
class ExplorationState:
    """Tracks exploration state to avoid loops."""
    visited_urls: Set[str] = field(default_factory=set)
    visited_elements: Dict[str, Set[str]] = field(default_factory=dict)  # url -> element IDs
    current_flow: List[Dict] = field(default_factory=list)
    completed_flows: List[Dict] = field(default_factory=list)
    observations: List[Observation] = field(default_factory=list)
    last_new_discovery_time: float = 0
    steps_since_last_discovery: int = 0
    total_steps: int = 0
    start_time: float = 0


@dataclass
class CoverageGoals:
    """Tracks coverage goals during exploration."""
    navigation_explored: bool = False
    forms_interacted: int = 0
    flows_discovered: int = 0
    pages_visited: int = 0
    errors_found: int = 0
    unique_elements_found: int = 0

    def coverage_score(self) -> float:
        """Calculate overall coverage score (0-1)."""
        score = 0.0
        if self.navigation_explored:
            score += 0.2
        score += min(self.forms_interacted / 5, 0.2)  # Up to 0.2 for forms
        score += min(self.flows_discovered / 3, 0.3)  # Up to 0.3 for flows
        score += min(self.pages_visited / 10, 0.2)  # Up to 0.2 for pages
        score += min(self.errors_found / 3, 0.1)  # Up to 0.1 for errors
        return min(score, 1.0)


class ExploratoryAgent(BaseAgent):
    """
    Enhanced E2E Exploratory Testing Agent.

    Features:
    - State tracking to avoid loops
    - Coverage goals for guided exploration
    - Observation capture with interest scoring
    - Smart termination (time + diminishing returns)
    - Auth support (credentials, session, none)
    - Test data integration
    """

    def __init__(self):
        super().__init__()
        self.state: Optional[ExplorationState] = None
        self.coverage: Optional[CoverageGoals] = None

    async def run(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Run exploratory testing."""
        url = config.get("url")
        instructions = config.get("instructions", "")
        time_limit_minutes = config.get("time_limit_minutes", 15)
        auth_config = config.get("auth") or {"type": "none"}
        test_data = config.get("test_data") or {}
        focus_areas = config.get("focus_areas") or []
        excluded_patterns = config.get("excluded_patterns") or []

        # Initialize state and coverage
        self.state = ExplorationState(start_time=time.time())
        self.coverage = CoverageGoals()

        print(f"🕵️‍♂️ Starting Enhanced Exploratory Agent on {url}")
        print(f"   Time limit: {time_limit_minutes} minutes")
        print(f"   Auth type: {auth_config.get('type', 'none')}")
        print(f"   Focus areas: {focus_areas if focus_areas else 'All'}")

        # Build the enhanced prompt
        prompt = self._build_exploration_prompt(
            url=url,
            instructions=instructions,
            time_limit_minutes=time_limit_minutes,
            auth_config=auth_config,
            test_data=test_data,
            focus_areas=focus_areas,
            excluded_patterns=excluded_patterns
        )

        # Execute exploration with timeout
        # Add 30 second buffer for processing time
        timeout_seconds = (time_limit_minutes * 60) + 30
        print(f"   Timeout: {timeout_seconds} seconds ({time_limit_minutes}min + 30s buffer)")

        try:
            result = await self._query_agent(prompt, timeout_seconds=timeout_seconds)
        except asyncio.TimeoutError:
            # Return partial results on timeout
            return {
                "summary": f"Exploration timed out after {time_limit_minutes} minutes",
                "elapsed_time_seconds": round(time.time() - self.state.start_time, 2),
                "elapsed_time_minutes": round((time.time() - self.state.start_time) / 60, 2),
                "termination_reason": "timeout",
                "discovered_flows": [],
                "action_trace": [],
                "coverage": {
                    "coverage_score": self.coverage.coverage_score(),
                    **self.coverage.__dict__
                },
                "timeout": True
            }

        # Process and return results
        return self._process_results(result, config)

    def _build_exploration_prompt(
        self,
        url: str,
        instructions: str,
        time_limit_minutes: int,
        auth_config: Dict[str, Any],
        test_data: Dict[str, Any],
        focus_areas: List[str],
        excluded_patterns: List[str]
    ) -> str:
        """Build the enhanced exploration prompt."""

        # Build auth section
        auth_section = ""
        if auth_config.get("type") == "credentials":
            auth_section = f"""
AUTHENTICATION:
- You need to log in first
- Navigate to: {auth_config.get('login_url', '/login')}
- Use credentials: username={auth_config.get('credentials', {}).get('username', '')}
- After login, proceed with exploration
"""
        elif auth_config.get("type") == "session":
            auth_section = """
AUTHENTICATION:
- Session is already authenticated (cookies loaded)
- Proceed directly with exploration
"""

        # Build test data section
        test_data_section = ""
        if test_data:
            test_data_section = "\nTEST DATA TO USE:\n"
            for key, values in test_data.items():
                if isinstance(values, list):
                    test_data_section += f"- {key}: {', '.join(str(v) for v in values)}\n"
                else:
                    test_data_section += f"- {key}: {values}\n"

        # Build focus areas section
        focus_section = ""
        if focus_areas:
            focus_section = "\nPRIORITY AREAS (explore these first):\n"
            focus_section += "\n".join(f"- {area}" for area in focus_areas)

        # Build exclusion section
        exclusion_section = ""
        if excluded_patterns:
            exclusion_section = "\nURL PATTERNS TO AVOID:\n"
            exclusion_section += "\n".join(f"- DO NOT visit: {pattern}" for pattern in excluded_patterns)

        return f"""You are an Enhanced E2E Exploration Agent with a {time_limit_minutes}-minute budget.

TARGET URL: {url}
{auth_section}
INSTRUCTIONS: {instructions if instructions else "Explore the application thoroughly."}

EXPLORATION STRATEGY:
1. DISCOVER: Start by exploring the site structure (navigation, main sections)
2. IDENTIFY: User flows (multi-step journeys like: browse → cart → checkout)
3. EXPLORE: Each flow with BOTH valid data AND edge cases
4. AVOID LOOPS: Track visited pages and elements, don't revisit same states
5. CAPTURE: Document all discoveries with clear action descriptions

COVERAGE GOALS (aim for these):
- Visit all navigation items
- Interact with all forms (submit valid + invalid data)
- Complete at least 3 end-to-end flows
- Visit 10+ unique pages
- Find and document any error states
{focus_section}
{test_data_section}
{exclusion_section}

SMART TERMINATION:
You should stop exploring when:
- Time limit is reached ({time_limit_minutes} minutes)
- 5 consecutive actions yield no new discoveries (diminishing returns)
- Coverage goals are met

IMPORTANT EXPLORATION RULES:
1. Focus on MULTI-PAGE flows (not single page tests)
2. For each flow, test:
   - HAPPY PATH: Complete the flow successfully
   - EDGE CASES: Empty fields, special chars, boundary values
3. Track every action for test spec generation
4. Be thorough but efficient - don't waste time on repetitive actions

CRITICAL: JAVASCRIPT ALERT HANDLING
When you encounter JavaScript dialogs (alert, confirm, prompt), you MUST handle them immediately:
- Use the browser_handle_dialog tool to accept or dismiss the dialog
- For alerts: Always accept (acknowledge and continue)
- For confirms: Test both accept and dismiss in different attempts
- For prompts: Either accept with test input or dismiss
- Dialogs block ALL page interaction - handle them first before continuing

If a dialog appears:
1. Use browser_handle_dialog with accept=true for alerts
2. Take a snapshot to verify the dialog is closed
3. Continue with your exploration

OUTPUT FORMAT (return ONLY JSON at the end):
```json
{{
  "summary": "One sentence overview (max 150 chars)",
  "discovered_flows": [
    {{
      "id": "flow_1",
      "title": "Flow Name (descriptive)",
      "pages": ["page1", "page2"],
      "steps_count": 5,
      "happy_path": "Complete happy path description",
      "edge_cases": ["case1", "case2"],
      "test_ideas": ["idea1", "idea2"],
      "entry_point": "/start-url",
      "exit_point": "/end-url",
      "complexity": "medium"
    }}
  ],
  "action_trace": [
    {{"step": 1, "action": "navigate", "target": "url", "outcome": "ok", "is_new_discovery": false}}
  ],
  "happy_paths_found": ["Flow1"],
  "edge_cases_found": ["case1"],
  "coverage": {{
    "navigation_explored": true,
    "forms_interacted": 2,
    "flows_discovered": 1,
    "pages_visited": 3,
    "errors_found": 0
  }},
  "total_actions": 5
}}
```

CRITICAL OUTPUT CONSTRAINTS:
- action_trace: MAX 30 entries - only significant actions
- discovered_flows: NO LIMIT - include ALL complete flows you discover
- Each flow: include title, steps, happy_path, edge_cases, test_ideas
- Each string field: MAX 300 characters (be descriptive but concise)
- NO HTML, NO screenshots, NO long text dumps

Begin exploration now:
Step 1: {"Navigate to login and authenticate" if auth_config.get("type") == "credentials" else f"Navigate to {url} and discover site structure"}
Step 2: Explore navigation and main features
Step 3: Identify and test user flows
Step 4: Return JSON summary when done or when termination condition is met"""

    def _process_results(self, result: Any, config: Dict[str, Any]) -> Dict[str, Any]:
        """Process exploration results and save full flows to file."""
        elapsed = time.time() - self.state.start_time
        run_id = config.get("run_id")

        try:
            data = extract_json_from_markdown(result)
            data["elapsed_time_seconds"] = round(elapsed, 2)
            data["elapsed_time_minutes"] = round(elapsed / 60, 2)
            data["config"] = {
                "url": config.get("url"),
                "time_limit_minutes": config.get("time_limit_minutes", 15),
                "auth_type": (config.get("auth") or {}).get("type", "none"),
                "focus_areas": config.get("focus_areas") or []
            }

            # Add coverage summary
            if "coverage" not in data:
                data["coverage"] = {
                    "navigation_explored": self.coverage.navigation_explored,
                    "forms_interacted": self.coverage.forms_interacted,
                    "flows_discovered": self.coverage.flows_discovered,
                    "pages_visited": self.coverage.pages_visited,
                    "errors_found": self.coverage.errors_found,
                    "coverage_score": self.coverage.coverage_score()
                }

            # Save full flows to file and return summaries
            if "discovered_flows" in data and run_id:
                full_flows = data["discovered_flows"]
                flow_summaries = self._save_flows_and_generate_summaries(
                    full_flows, run_id
                )
                data["discovered_flow_summaries"] = flow_summaries
                data["total_flows_discovered"] = len(full_flows)
                # Remove full flows from main result to keep it small
                del data["discovered_flows"]
            elif "discovered_flows" in data:
                # Fallback if no run_id: just use the flows as-is
                data["discovered_flow_summaries"] = [
                    self._create_flow_summary(flow, i)
                    for i, flow in enumerate(data["discovered_flows"])
                ]
                data["total_flows_discovered"] = len(data["discovered_flows"])
                del data["discovered_flows"]
            else:
                data["discovered_flow_summaries"] = []
                data["total_flows_discovered"] = 0

            # Determine termination reason
            data["termination_reason"] = self._get_termination_reason(
                elapsed=elapsed,
                time_limit_minutes=config.get("time_limit_minutes", 15)
            )

            return data

        except Exception as e:
            # Provide more context about the error
            result_str = str(result)
            preview = result_str[:2000] if len(result_str) > 2000 else result_str

            return {
                "summary": f"Exploration completed but result parsing failed. The agent likely explored successfully but the output was too large or truncated.",
                "elapsed_time_seconds": round(elapsed, 2),
                "elapsed_time_minutes": round(elapsed / 60, 2),
                "error": str(e),
                "error_type": type(e).__name__,
                "raw_output_preview": preview,
                "raw_output_length": len(result_str),
                "config": {
                    "url": config.get("url"),
                    "time_limit_minutes": config.get("time_limit_minutes", 15),
                    "auth_type": (config.get("auth") or {}).get("type", "none"),
                },
                "coverage": {
                    "coverage_score": self.coverage.coverage_score(),
                    "navigation_explored": self.coverage.navigation_explored,
                    "forms_interacted": self.coverage.forms_interacted,
                    "flows_discovered": self.coverage.flows_discovered,
                    "pages_visited": self.coverage.pages_visited,
                    "errors_found": self.coverage.errors_found,
                },
                "discovered_flow_summaries": [],
                "total_flows_discovered": 0,
                "parsing_failed": True
            }

    def _save_flows_and_generate_summaries(
        self, flows: List[Dict], run_id: str
    ) -> List[Dict]:
        """Save full flows to file and return summaries."""
        # Create runs directory if it doesn't exist
        runs_dir = Path("runs")
        runs_dir.mkdir(exist_ok=True)

        # Create run-specific directory
        run_dir = runs_dir / run_id
        run_dir.mkdir(exist_ok=True)

        # Save full flows to JSON file
        flows_file = run_dir / "flows.json"
        with open(flows_file, 'w') as f:
            json.dump({"flows": flows}, f, indent=2)

        print(f"💾 Saved {len(flows)} flows to {flows_file}")

        # Generate summaries
        return [self._create_flow_summary(flow, i) for i, flow in enumerate(flows)]

    def _create_flow_summary(self, flow: Dict, index: int) -> Dict:
        """Create a summary from a full flow."""
        return {
            "id": flow.get("id", f"flow_{index + 1}"),
            "title": flow.get("title", f"Flow {index + 1}"),
            "pages": flow.get("pages", []),
            "steps_count": flow.get("steps_count", len(flow.get("pages", []))),
            "has_happy_path": bool(flow.get("happy_path")),
            "has_edge_cases": bool(flow.get("edge_cases") and len(flow.get("edge_cases", [])) > 0),
            "entry_point": flow.get("entry_point", ""),
            "exit_point": flow.get("exit_point", ""),
            "complexity": flow.get("complexity", "unknown")
        }

    def _get_termination_reason(self, elapsed: float, time_limit_minutes: int) -> str:
        """Determine why exploration terminated."""
        time_limit_seconds = time_limit_minutes * 60

        if elapsed >= time_limit_seconds * 0.95:
            return "time_limit_reached"
        elif self.state.steps_since_last_discovery >= 5:
            return "no_new_discoveries"
        elif self.coverage.coverage_score() >= 0.8:
            return "coverage_goals_met"
        else:
            return "completed"


# Legacy compatibility - keep old max_steps interface working
async def run_legacy(config: Dict[str, Any]) -> Dict[str, Any]:
    """Legacy interface for backward compatibility."""
    # Convert old max_steps config to new time-based config
    if "max_steps" in config:
        # Approximate: 10 steps ≈ 2 minutes
        time_limit = max(2, config["max_steps"] // 5)
        config["time_limit_minutes"] = time_limit

    agent = ExploratoryAgent()
    return await agent.run(config)
