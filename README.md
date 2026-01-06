# Playwright Agent: Natural Language to Test Script Converter

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Playwright](https://img.shields.io/badge/Playwright-45ba4b?style=flat&logo=Playwright&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)

Convert plain English test specifications into production-ready Playwright TypeScript tests using AI agents.

## 🚀 Overview

This automated pipeline transforms markdown-based test descriptions into executable Playwright tests. It leverages the power of LLMs (Claude) and the Claude Code Agent SDK to intelligently plan, execute, and validate test scenarios.

## ✨ Features
- **🤖 Natural Language to Code**: Convert simple English instructions into Playwright tests.
- **🖥️ Web Dashboard**: Manage specifications, run tests, and view results in a modern UI.
- **👁️ Interactive Mode**: Review plans and verify execution in real-time (`--interactive`).
- **📊 Rich Reporting**: Generates HTML reports and GIF replays of the execution.
- **🛡️ Self-Healing**: Automatically detects errors (timeouts, changed selectors) and fixes them on the fly.
- **🏗️ Structured Output**: Produces Page Object Models (POM) and clean, maintainable code.
- **⚡ Fast Execution**: Using intelligent caching and optimized browser contexts.

## 🚀 Usage

### ⚡️ Smart Run & Self-Healing

The agent now checks for existing generated code before starting a new run.
- **Reuse**: If valid code exists for a spec, it is run immediately (Stage 0).
- **Heal**: If the existing code fails, the agent attempts to "heal" (debug and fix) it instead of regenerating from scratch.
- **Regenerate**: Full regeneration only happens if healing fails or no code exists.

### 📊 Web Dashboard

A Next.js-based dashboard is available to manage specs and runs.

```bash
./start-ui.sh
```

Features:
- **Spec Management**: View and create test specifications.
- **Run History**: detailed logs, execution plans, and generated code.
- **Live Logs**: Watch test execution in real-time.
- **Syntax Highlighting**: Beautiful code display for Specs and Tests.
Access the dashboard at [http://localhost:3000](http://localhost:3000).

### CLI Execution
```bash
playwright-agent specs/login_test.md
```

### Interactive Mode
Run with `--interactive` to review the plan before execution:
```bash
playwright-agent specs/login_test.md --interactive
```

### Output
After execution, check the `runs/` directory for:
- `report.html` - Detailed execution log
- `execution.gif` - Visual replay
- `run.video` - Full video (if enabled)
- `export.json` - Generated Playwright code

## 📦 Installation

### Prerequisites

-   Python 3.13+
-   Node.js 18+
-   Modern web browser (Chromium)
-   Claude Code (for Agent SDK)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-username/playwright-agent.git
cd playwright-agent

# 2. Install the package (and Python dependencies)
cd orchestrator
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
cd ..
pip install -e .

# 3. Install Node.js dependencies
npm install @playwright/test --save-dev

# 4. Install Playwright browsers
npx playwright install chromium
```

### Configuration

The system loads credentials from `~/.claude/settings.json`. We recommend using **Z.ai** for cost-effective access (GLM 4.7 model).

For detailed setup instructions, see: [Z.ai Claude Code Integration Guide](https://docs.z.ai/scenario-example/develop-tools/claude).

Ensure your `~/.claude/settings.json` is configured as follows:

```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "your-z-ai-token-here",
    "ANTHROPIC_BASE_URL": "https://api.z.ai/api/anthropic",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "glm-4.7"
  }
}
```

## 📖 Usage

### Convert a Test Spec

```bash
playwright-agent specs/your-test.md
```

**Output:**
-   `runs/YYYY-MM-DD_HH-MM-SS/`: artifacts (plan, run trace, logs).
-   `tests/generated/your-test.spec.ts`: The generated Playwright test.

### Run Generated Tests

```bash
# Run all
npx playwright test

# Run specific file
npx playwright test tests/generated/your-test.spec.ts
```

## 📝 Test Specifications

Test specs are written in markdown in the `specs/` directory.

### Example Spec

```markdown
# Test: Login Form

## Description
Verify user can log in with valid credentials.

## Steps
1. Navigate to https://the-internet.herokuapp.com/login
2. Enter username "tomsmith"
3. Enter password "SuperSecretPassword!"
4. Click "Login"
5. Verify success message is visible
```

### Supported Actions

-   `navigate` - Go to a URL
-   `click` - Click an element
-   `fill` - Input text
-   `select` - Select dropdown option
-   `check`/`uncheck` - Toggle checkboxes
-   `wait` - Pause for condition
-   `assert` - Verify visibility/text
-   `screenshot` - Capture current state

## 📂 Project Structure

```
test-script-converter/
├── orchestrator/
│   ├── workflows/        # Core pipeline logic
│   │   ├── planner.py    # LLM Planning
│   │   ├── operator.py   # MCP Browser Execution
│   │   ├── exporter.py   # Code Generation
│   │   └── validator.py  # Self-Healing
├── schemas/              # JSON Schemas for inter-process communication
├── specs/                # Input Markdown Specifications
├── tests/generated/      # Output TypeScript Tests
├── orchestrator_runner.py # Main Entry Point (Multi-process)
└── convert-test          # CLI Wrapper
```

## ❓ Troubleshooting

### Test Timeout
Complex pages may require longer timeouts. The system defaults to 30s.

### SDK Cleanup Error
If `orchestrator` processes fail to exit cleanly, check for zombie python processes. The `orchestrator_runner.py` is designed to isolate these faults.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
