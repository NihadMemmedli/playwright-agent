# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## System Overview

This is a **Natural Language to Test Script Converter** - an AI-powered 4-stage pipeline that converts plain English test specifications into production-ready Playwright tests.

**Key capability**: Write tests in markdown → Get validated, passing Playwright code automatically.

## Core Commands

### Convert Test Spec to Playwright Test
```bash
./simple_orchestrator.py specs/your-test.md
```

This runs the complete 4-stage pipeline and produces:
- `runs/TIMESTAMP/plan.json` - Test plan from spec
- `runs/TIMESTAMP/run.json` - Execution trace
- `runs/TIMESTAMP/export.json` - Generation metadata
- `runs/TIMESTAMP/validation.json` - Validation result
- `tests/generated/your-test.spec.ts` - Generated Playwright test

### Run Generated Tests
```bash
# Run all generated tests
npx playwright test

# Run specific test
npx playwright test tests/generated/your-test.spec.ts

# UI mode for debugging
npx playwright test --ui
```

### Environment Setup
```bash
# Python dependencies
cd orchestrator
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Node.js dependencies
npm install @playwright/test --save-dev
npx playwright install chromium
```

## Architecture: 4-Stage Pipeline

### Stage 1: Planner (`orchestrator/workflows/planner.py`)
Converts markdown specs to structured JSON test plans.
- **Input**: Markdown test specification
- **Output**: `plan.json` with test steps, actions, assertions
- **Agent**: `test-planner` (Read tools only)
- **Validation**: `schemas/plan.schema.json`

### Stage 2: Operator (`orchestrator/workflows/operator.py`)
Executes test plans in real browsers using Playwright MCP.
- **Input**: JSON test plan
- **Output**: `run.json` with execution trace, screenshots
- **Agent**: `test-operator` (Playwright MCP tools)
- **Validation**: `schemas/run.schema.json`
- **Key feature**: Validates selectors actually work in real browsers

### Stage 3: Exporter (`orchestrator/workflows/exporter.py`)
Generates production-ready Playwright test code.
- **Input**: Execution trace
- **Output**: TypeScript test file
- **Agent**: `test-exporter` (Write tools)
- **Validation**: `schemas/export.schema.json`
- **Code style**: Role-based selectors, `test.step()` grouping, best practices

### Stage 4: Validator (`orchestrator/workflows/validator.py`)
Runs tests and automatically fixes failures.
- **Input**: Generated test file
- **Output**: `validation.json` with results
- **Agent**: `test-validator` (debugging + Write tools)
- **Key feature**: Self-healing, up to 3 retry attempts

## Important Patterns

### Subprocess Execution
Each stage runs as a separate subprocess to avoid SDK cleanup issues:
- Main orchestrator: `simple_orchestrator.py`
- Individual components: `orchestrator/workflows/{planner,operator,exporter,validator}.py`

### Credential Loading
**Critical**: The system loads Claude credentials from `~/.claude/settings.json` via `orchestrator/load_env.py`.

All workflow files call `setup_claude_env()` before using the Agent SDK to ensure custom API endpoints, tokens, and models are loaded.

### Agent Tool Access
Each agent has specific tool permissions defined in `.claude/agents/*.md`:
- **Planner**: Read tools only
- **Operator**: All Playwright MCP tools (`mcp__*__*`)
- **Exporter**: Write tools
- **Validator**: Bash + Write + Playwright MCP for debugging

### JSON Output Format
Agents output JSON in markdown code blocks:
```markdown
```json
{
  "key": "value"
}
```
```

Parsed by `orchestrator/utils/json_utils.py:extract_json_from_markdown()`.

### Selector Strategy
Generated code uses role-based selectors (best practice):
- ✅ `getByRole('button', {name: 'Login'})`
- ✅ `getByLabel('Username')`
- ✅ `getByText('Hello World')`
- ❌ `locator('.btn-primary')` (CSS selectors avoided)

## Configuration Files

### `.mcp.json`
Configures Playwright MCP server for browser automation:
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

### `playwright.config.ts`
Playwright test configuration - points to `tests/generated/` directory.

### `~/.claude/settings.json`
**Must contain**:
```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "your-token",
    "ANTHROPIC_BASE_URL": "https://your-api-endpoint",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "your-model"
  }
}
```

The system auto-loads this via `orchestrator/load_env.py`.

## Test Specification Format

Test specs in `specs/` follow this structure:

```markdown
# Test: Test Name

## Description
What the test does.

## Steps

1. Navigate to https://example.com
2. Click the "Submit" button
3. Enter "value" into the field
4. Verify the success message appears

## Expected Outcome
- Expected results
```

**Supported actions**: `navigate`, `click`, `fill`, `assert`, `screenshot`

## Common Issues

### SDK Cleanup Error
**Symptom**: "Attempted to exit cancel scope in a different task"
**Solution**: Already handled - components run as separate subprocesses

### Buffer Overflow
**Symptom**: "JSON message exceeded maximum buffer size"
**Solution**: Agent prompts limit output size (keep `< 50KB`)

### Authentication Error
**Symptom**: "Your account does not have access to Claude Code"
**Solution**: Ensure `~/.claude/settings.json` exists with valid credentials

### Selector Failures
**Symptom**: Generated test fails with "element not found"
**Solution**: Validator automatically fixes most selector issues

## File Structure Notes

- **`specs/`** - Input test specifications (markdown)
- **`tests/generated/`** - Output Playwright tests (TypeScript)
- **`runs/TIMESTAMP/`** - Conversion artifacts (JSON)
- **`orchestrator/workflows/`** - Pipeline stage implementations
- **`schemas/`** - JSON schemas for validation
- **`.claude/agents/`** - Agent behavior definitions

## Validation Status

**Core tests (4/4 passing, 100% success rate)**:
- `01_simple_navigation.md` - 3 steps, 353ms
- `02_form_interaction.md` - 6 steps, 2.9s
- `03_multi_step_workflow.md` - 11 steps, 3.2s
- `04_dynamic_content.md` - 5 steps, 8.2s

All generated tests use role-based selectors and pass in real browsers.
