# Playwright Agent: Natural Language to Test Script Converter

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Playwright](https://img.shields.io/badge/Playwright-45ba4b?style=flat&logo=Playwright&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)

Convert plain English test specifications into production-ready Playwright TypeScript tests using AI agents.

## 🚀 Overview

This automated pipeline transforms markdown-based test descriptions into executable Playwright tests. It leverages the power of LLMs (Claude) and the Claude Code Agent SDK to intelligently plan, execute, and validate test scenarios.

## ✨ Features

-   **🤖 AI-Powered Planning**: Converts natural language steps into structured execution plans.
-   **🔌 Live Browser Operation**: Interacts with a real browser to validate selectors and accessibility.
-   **🛠️ Auto-Correction**: Self-healing mechanism that attempts to fix tests if they fail validation.
-   **📦 Type-Safe Output**: Generates clean, readable TypeScript code compatible with Playwright test runner.
-   **🔍 Multi-Stage Pipeline**:
    1.  **Planner**: Understands intent.
    2.  **Operator**: Explores and validates.
    3.  **Exporter**: Writes the code.
    4.  **Validator**: Ensures reliability.

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

# 2. Install Python dependencies
cd orchestrator
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# 3. Install Node.js dependencies
cd ..
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
./convert-test specs/your-test.md
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
