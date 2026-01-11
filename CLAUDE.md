# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## System Overview

This is a **Natural Language to Test Script Converter** - an AI-powered 5-stage pipeline with a dual-interface architecture (CLI + Web Dashboard) that converts plain English test specifications into production-ready Playwright tests.

**Key capability**: Write tests in markdown → Get validated, passing Playwright code automatically.

**Architecture**: Python backend (orchestrator/) + Next.js frontend (web/) + PostgreSQL database + Playwright test runner

## Core Commands

### Quick Start (Full Setup)
```bash
# One-time setup (Python venv, Node deps, Playwright browsers, Database)
make setup

# Start web dashboard (Backend API on :8001 + Frontend on :3000)
make dev

# Run a specific test spec via CLI
make run SPEC=specs/your-test.md
```

### Convert Test Spec to Playwright Test
```bash
# Direct CLI execution
python orchestrator/cli.py specs/your-test.md

# Or with virtual environment activated
source venv/bin/activate
python orchestrator/cli.py specs/your-test.md

# Interactive mode (review plan before execution)
python orchestrator/cli.py specs/your-test.md --interactive
```

This runs the complete 5-stage pipeline and produces:
- `runs/TIMESTAMP/plan.json` - Test plan from spec
- `runs/TIMESTAMP/run.json` - Execution trace with screenshots
- `runs/TIMESTAMP/export.json` - Generation metadata
- `runs/TIMESTAMP/validation.json` - Validation result
- `tests/generated/your-test.spec.ts` - Generated Playwright test
- `runs/TIMESTAMP/report.html` - Visual execution report

### Run Generated Tests
```bash
# Run all generated tests
npx playwright test

# Run specific test
npx playwright test tests/generated/your-test.spec.ts

# UI mode for debugging
npx playwright test --ui

# Run on specific browser
npx playwright test --project chromium
npx playwright test --project firefox
npx playwright test --project webkit
```

### Web Dashboard Operations
```bash
# Start full stack (Database + Backend API + Frontend)
./start-ui.sh

# Access points:
# - Frontend: http://localhost:3000
# - Backend API: http://localhost:8001
# - API Docs: http://localhost:8001/docs
```

### Development & Testing
```bash
# Clean run artifacts
make clean

# Database operations (via Docker)
docker-compose up -d db    # Start database only
docker-compose down         # Stop all services

# Python testing
cd orchestrator
python -m pytest test_e2e.py  # Run end-to-end tests
```

### Environment Setup
```bash
# Automated setup (recommended)
make setup

# Manual setup
# 1. Python virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -e .  # or pip install -r requirements.txt

# 2. Playwright browsers (root project)
npm install
npx playwright install

# 3. Web dashboard dependencies
cd web && npm install && cd ..

# 4. Start database
docker-compose up -d db
```

## Architecture: 5-Stage Pipeline + Dual Interfaces

### Execution Modes

**CLI Mode** (`orchestrator/cli.py`):
- Direct command-line execution
- Interactive mode available (`--interactive`)
- File-based artifact storage
- No database required

**Web Dashboard Mode** (`orchestrator/api/` + `web/`):
- Next.js frontend on port 3000
- FastAPI backend on port 8001
- PostgreSQL database for persistence
- Real-time execution monitoring
- Spec organization and management
- Run history and analytics

### Pipeline Stages

#### Stage 0: Smart Check (New)
Checks for existing generated code before running full pipeline.
- **Reuse**: If valid code exists, run it directly
- **Heal**: If failing code exists, attempt to fix it
- **Regenerate**: Only if no code exists or healing fails

#### Stage 1: Planner (`orchestrator/workflows/planner.py`)
Converts markdown specs to structured JSON test plans.
- **Input**: Markdown test specification
- **Output**: `plan.json` with test steps, actions, assertions
- **Agent**: `test-planner` (Read tools only)
- **Validation**: `schemas/plan.schema.json`
- **Schema**: Test name, description, steps array with action/target/assertion

#### Stage 2: Operator (`orchestrator/workflows/operator.py`)
Executes test plans in real browsers using Playwright MCP.
- **Input**: JSON test plan
- **Output**: `run.json` with execution trace, screenshots
- **Agent**: `test-operator` (Playwright MCP tools)
- **Validation**: `schemas/run.schema.json`
- **Key feature**: Validates selectors actually work in real browsers
- **Debugging**: Takes screenshots and captures accessibility trees on errors

#### Stage 3: Exporter (`orchestrator/workflows/exporter.py`)
Generates production-ready Playwright test code.
- **Input**: Execution trace from operator
- **Output**: TypeScript test file in `tests/generated/`
- **Agent**: `test-exporter` (Write tools)
- **Validation**: `schemas/export.schema.json`
- **Code style**: Role-based selectors, `test.step()` grouping, best practices
- **Security**: Uses `process.env.VAR_NAME` for credentials (no hardcoded secrets)

#### Stage 4: Validator (`orchestrator/workflows/validator.py`)
Runs tests and automatically fixes failures.
- **Input**: Generated test file
- **Output**: `validation.json` with results
- **Agent**: `test-validator` (Bash + Write + Playwright MCP for debugging)
- **Key feature**: Self-healing with up to 3 retry attempts
- **Fixes**: Selector issues, timing problems, timeout adjustments

## Important Patterns

### Subprocess Execution
Each stage runs as a separate subprocess to avoid SDK cleanup issues:
- Main orchestrator: `orchestrator/cli.py` (entry point)
- Individual components: `orchestrator/workflows/{planner,operator,exporter,validator}.py`
- Each workflow invokes its agent via the Agent SDK

### Credential Loading
**Critical**: The system loads Claude credentials from `~/.claude/settings.json` via `orchestrator/load_env.py`.

All workflow files call `setup_claude_env()` before using the Agent SDK to ensure:
- Custom API endpoints (ANTHROPIC_BASE_URL)
- Authentication tokens (ANTHROPIC_AUTH_TOKEN)
- Model selection (ANTHROPIC_DEFAULT_SONNET_MODEL)
- Environment variables from `.env` file

**Supported providers**:
- Z.ai (recommended for cost): `https://api.z.ai/api/anthropic` with `glm-4.7`
- OpenRouter (free models available): `https://openrouter.ai/api`
- Anthropic direct: `https://api.anthropic.com`

### Agent Tool Access
Each agent has specific tool permissions defined in `.claude/agents/*.md`:
- **test-planner**: Read tools only (`tools: Read`)
- **test-operator**: All Playwright MCP tools (`tools: mcp__*__*`)
- **test-exporter**: Write tools (`tools: Write`)
- **test-validator**: Bash + Write + Playwright MCP (`tools: Bash, Write, mcp__*__*`)

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
Generated code uses role-based selectors (Playwright best practice):
- ✅ `getByRole('button', {name: 'Login'})` - Most resilient
- ✅ `getByLabel('Username')` - Best for form fields
- ✅ `getByText('Hello World')` - Good for text content
- ✅ `getByPlaceholder('Enter email')` - For input placeholders
- ❌ `locator('.btn-primary')` - CSS selectors avoided (brittle)

### Security & Credential Handling
**Environment Variable Substitution**:
1. Define secrets in `.env`: `LOGIN_PASSWORD=SecretPassword123`
2. Use placeholders in spec: `Enter password "{{LOGIN_PASSWORD}}"`
3. System substitutes values at runtime (scrubbed from logs)
4. Generated code uses: `process.env.LOGIN_PASSWORD`

**Secret Scrubbing**:
- Credentials are removed from execution traces (`run.json`)
- No hardcoded secrets in generated tests
- Safe for version control

### Database Integration (Web Dashboard Mode)
**Schema** (`orchestrator/api/models_db.py`):
- `SpecMetadata`: Test specifications with folders/tags
- `TestRun`: Execution runs with status/duration/results
- `AgentRun`: Individual agent execution logs

**Sync Behavior**:
- On startup, syncs existing file-based runs to database
- File-based artifacts remain source of truth
- Database enables querying and history

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
Playwright test configuration:
- **testDir**: `./tests/generated` (auto-generated tests)
- **projects**: Chromium, Firefox, WebKit
- **outputDir**: `./test-results` (screenshots, videos, traces)
- **retries**: 2 in CI, 0 locally
- **baseURL**: `https://the-internet.herokuapp.com` (configurable)

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

### `.env` (Project Root)
Environment variables for test credentials:
```env
LOGIN_USERNAME=tomsmith
LOGIN_PASSWORD=SuperSecretPassword!
BASE_URL=https://the-internet.herokuapp.com
```

**IMPORTANT**: Never commit `.env` to version control.

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

**Supported actions**: `navigate`, `click`, `fill`, `select`, `check`, `uncheck`, `wait`, `assert`, `screenshot`, `check visual`

**Visual Regression Testing**:
- Add step: "Verify visual layout"
- Generates: `expect(page).toHaveScreenshot()`
- First run captures baseline, subsequent runs compare

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

### Database Connection Error
**Symptom**: "Connection refused" or "database does not exist"
**Solution**: Start database with `docker-compose up -d db`, verify port 5434

### Docker Not Running
**Symptom**: "Cannot connect to Docker daemon"
**Solution**: Start Docker Desktop before running `make dev`

## File Structure Notes

- **`specs/`** - Input test specifications (markdown)
- **`tests/generated/`** - Output Playwright tests (TypeScript)
- **`runs/TIMESTAMP/`** - Conversion artifacts (JSON, HTML reports)
- **`orchestrator/`** - Python backend
  - `workflows/` - 4 pipeline stage implementations
  - `api/` - FastAPI endpoints for web dashboard
  - `cli.py` - CLI entry point
  - `load_env.py` - Credential loading
- **`web/`** - Next.js frontend dashboard
  - `src/app/` - React pages and components
  - `src/app/specs/` - Spec management
  - `src/app/runs/` - Run history viewer
- **`schemas/`** - JSON schemas for validation
- **`.claude/agents/`** - Agent behavior definitions
- **`docker-compose.yml`** - Container orchestration (DB + Backend + Frontend)

## Key Integration Points

### CLI → Agent SDK
- `orchestrator/cli.py` → workflows → Agent SDK (`query()`)
- Each stage is a separate Python process
- Results passed via JSON files

### Agent SDK → Playwright MCP
- Operator stage uses `mcp__playwright__*` tools
- Real browser execution with accessibility trees
- Screenshots on errors for debugging

### FastAPI → Next.js
- Backend: `orchestrator/api/main.py` (port 8001)
- Frontend: `web/src/app/` (port 3000)
- CORS enabled for cross-origin requests
- Static artifact serving via `/artifacts` route

### File System → Database
- CLI mode: File-based only (no DB required)
- Web mode: DB + file hybrid (DB indexes file artifacts)
- Sync on startup: `orchestrator/api/main.py::sync_data_from_files()`

## Development Workflow

### Adding New Features to Pipeline
1. Update workflow in `orchestrator/workflows/[stage].py`
2. Modify agent prompt in `.claude/agents/test-[stage].md`
3. Update schema in `schemas/[stage].schema.json` if JSON structure changes
4. Test with: `python orchestrator/cli.py specs/test-example.md`

### Adding New Web Dashboard Features
1. Backend: Add endpoint in `orchestrator/api/main.py` or sub-router
2. Frontend: Create page in `web/src/app/[route]/page.tsx`
3. Update TypeScript types if data model changes
4. Test with: `make dev` and access http://localhost:3000

### Modifying Test Generation
1. Update `test-exporter.md` agent prompt for code style changes
2. Modify `orchestrator/workflows/exporter.py` for generation logic
3. Update `schemas/export.schema.json` if metadata structure changes
4. Test generation and validation in end-to-end run
