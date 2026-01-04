# Natural Language to Test Script Converter

Convert plain English test specifications into production-ready Playwright tests using AI.

## Overview

This system transforms natural language test descriptions into executable Playwright tests through a 4-stage AI-powered pipeline:

1. **Planner** - Converts markdown specs to JSON test plans
2. **Operator** - Executes plans in real browsers using Playwright MCP
3. **Exporter** - Generates production-ready Playwright test code
4. **Validator** - Automatically fixes failing tests

**Result:** Write tests in plain English → Get validated, passing Playwright code in minutes.

## What Makes This Different

- ✅ **Real Browser Execution** - Tests actually run before code generation
- ✅ **Intelligent Selectors** - "Username field" → getByLabel('Username')
- ✅ **Self-Healing** - Validator automatically fixes common failures
- ✅ **Production Quality** - Role-based selectors, best practices built-in
- ✅ **Zero Manual Intervention** - Fully automated pipeline

## Installation

### Prerequisites

- Python 3.13+
- Node.js 18+
- Modern web browser (Chromium)
- Claude Code with API access

### Setup

```bash
# 1. Clone the repository
cd test-script-converter

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

The system automatically loads your Claude credentials from `~/.claude/settings.json`.

If you have a custom Claude setup (e.g., API proxy, custom models), ensure your `~/.claude/settings.json` contains:

```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "your-token-here",
    "ANTHROPIC_BASE_URL": "https://api.z.ai/api/anthropic",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "glm-4.7"
  }
}
```

The orchestrator will automatically load these settings.

## Usage

### Convert a Test Spec

```bash
./simple_orchestrator.py specs/your-test.md
```

**Output:**
- `runs/YYYY-MM-DD_HH-MM-SS/` - Conversion artifacts
  - `plan.json` - Test plan from spec
  - `run.json` - Execution trace
  - `export.json` - Generation metadata
  - `validation.json` - Validation result
- `tests/generated/your-test.spec.ts` - Generated Playwright test

### Run Generated Tests

```bash
# Run all generated tests
npx playwright test

# Run specific test
npx playwright test tests/generated/your-test.spec.ts

# Run with UI mode
npx playwright test --ui
```

## Example

### Input (Natural Language)

```markdown
# Test: Login Form

Go to the login page at the-internet.herokuapp.com/login.
Enter username "tomsmith" and password "SuperSecretPassword!".
Click the Login button.
Verify the success message appears.
```

### Output (Playwright Test)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Login Form', () => {
  test('should successfully log in', async ({ page }) => {
    await test.step('Navigate to login page', async () => {
      await page.goto('https://the-internet.herokuapp.com/login');
    });

    await test.step('Enter username', async () => {
      await page.getByLabel('Username').fill('tomsmith');
    });

    await test.step('Enter password', async () => {
      await page.getByLabel('Password').fill('SuperSecretPassword!');
    });

    await test.step('Click login button', async () => {
      await page.getByRole('button', { name: 'Login' }).click();
    });

    await test.step('Verify success message', async () => {
      await expect(page.getByText('You logged into a secure area!')).toBeVisible();
    });
  });
});
```

**Result:** ✅ Test passes in real browser (2.9s)

## Test Specifications

Test specs are written in markdown with clear, simple language:

```markdown
# Test: Your Test Name

## Description
Brief description of what the test does.

## Steps

1. Navigate to https://example.com
2. Click the "Login" button
3. Enter "username" into the username field
4. Verify the success message appears

## Expected Outcome
- User is logged in successfully
- Success message is displayed
```

### Supported Actions

- `navigate` - Navigate to a URL
- `click` - Click on an element
- `fill` - Fill in a form field
- `assert` - Verify something is visible/true
- `screenshot` - Take a screenshot

## Validation Status

### Validated Tests (4/4 Passing)

| Test | Steps | Duration | Status |
|------|-------|----------|--------|
| Simple Navigation | 3 | 353ms | ✅ PASSED |
| Login Form Interaction | 6 | 2.9s | ✅ PASSED |
| Multi-Step Auth Workflow | 11 | 3.2s | ✅ PASSED |
| Dynamic Content Loading | 5 | 8.2s | ✅ PASSED |

**Success Rate: 100%**

All generated tests:
- Use role-based selectors (best practice)
- Include proper error handling
- Follow Playwright best practices
- Pass in real browsers

### Complex Scenarios (Experimental)

Additional test specs are provided for more complex scenarios:
- `specs/05_ecommerce_workflow.md` - Shopping cart workflow
- `specs/06_data_table_pagination.md` - Table pagination
- `specs/07_modal_dialog_interactions.md` - Modal dialogs
- `specs/08_form_validation.md` - Form validation

**Note:** These may require longer timeouts or adjustments depending on external site responsiveness.

## Project Structure

```
test-script-converter/
├── orchestrator/
│   ├── workflows/
│   │   ├── planner.py      # Stage 1: Spec → Plan
│   │   ├── operator.py     # Stage 2: Plan → Execute
│   │   ├── exporter.py     # Stage 3: Execute → Code
│   │   └── validator.py    # Stage 4: Validate & Fix
│   ├── utils/
│   │   └── json_utils.py   # JSON utilities
│   └── requirements.txt    # Python dependencies
├── schemas/
│   ├── plan.schema.json    # Test plan validation
│   ├── run.schema.json     # Execution trace validation
│   └── export.schema.json  # Export metadata validation
├── .claude/agents/         # Agent behavior definitions
│   ├── test-planner.md
│   ├── test-operator.md
│   ├── test-exporter.md
│   └── test-validator.md
├── specs/                  # Test specifications (Markdown)
├── tests/generated/        # Generated Playwright tests
├── runs/                   # Conversion artifacts
├── simple_orchestrator.py  # Main entry point
├── playwright.config.ts    # Playwright configuration
└── package.json            # Node.js dependencies
```

## How It Works

### Stage 1: Planning
The **Planner** reads your markdown spec and creates a structured JSON test plan.

### Stage 2: Execution
The **Operator** executes the plan in a real browser using Playwright MCP:
- Finds elements using vague descriptions ("Username field")
- Interacts with the page
- Captures screenshots and execution trace
- **Validates selectors actually work**

### Stage 3: Code Generation
The **Exporter** converts the successful execution into production-ready Playwright code:
- Uses role-based selectors (best practice)
- Organizes steps with `test.step()`
- Adds descriptive comments
- Follows Playwright best practices

### Stage 4: Validation
The **Validator** runs the generated test and automatically fixes failures:
- Handles selector issues
- Fixes timing problems
- Resolves visibility issues
- Iterates up to 3 times to ensure tests pass

## Key Features

### 📝 Natural Language Input
Write tests in plain English - no coding required

### 🤖 Intelligent Element Discovery
Vague descriptions work automatically:
- "Username field" → `getByLabel('Username')`
- "Login button" → `getByRole('button', {name: 'Login'})`

### 🌐 Real Browser Validation
Tests actually execute in Chromium before code generation

### ✨ Production-Ready Output
- Role-based selectors (accessibility-first)
- Proper async/await patterns
- Organized with `test.step()` for better reporting
- Clear assertions and error handling

### 🔧 Automatic Test Fixing
Validator handles common failures:
- Selector problems (wrong element, multiple matches)
- Timing issues (dynamic content, loading)
- Visibility issues (hidden elements, animations)

## Technologies

- **Claude Agent SDK 0.1.18** - AI-powered code generation
- **Playwright MCP** - Browser automation
- **JSON Schema** - Output validation
- **Playwright Test** - Test execution
- **Python 3.13+** - Backend logic
- **TypeScript** - Generated test code

## Troubleshooting

### Test Timeout
Increase timeout in your test or use `test.setTimeout()`

### Selector Issues
The validator will automatically fix most selector problems

### SDK Cleanup Error
This is a known issue - components run as separate subprocesses to avoid it

## License

MIT License

## Summary

**From plain English to validated passing tests - automatically.**

- ✅ 100% test pass rate on validated scenarios
- ✅ Production-ready code quality
- ✅ Real browser execution validation
- ✅ Self-healing test generation
- ✅ Zero manual intervention required
