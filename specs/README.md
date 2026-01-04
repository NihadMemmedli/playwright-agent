# Test Specifications

This directory contains natural language test specifications that will be converted to Playwright test code.

## Available Test Scenarios

### 01_simple_navigation.md
**Target**: https://example.com
**Complexity**: ⭐ Basic
**Features Tested**:
- Page navigation
- Element visibility
- Screenshot capture

**Use Case**: Verify the most basic test generation functionality

---

### 02_form_interaction.md
**Target**: https://the-internet.herokuapp.com/login
**Complexity**: ⭐⭐ Intermediate
**Features Tested**:
- Form filling (username, password)
- Button clicking
- Success message verification
- URL change detection

**Credentials**:
- Username: `tomsmith`
- Password: `SuperSecretPassword!`

**Use Case**: Test form interaction and submission

---

### 03_multi_step_workflow.md
**Target**: https://the-internet.herokuapp.com
**Complexity**: ⭐⭐⭐ Advanced
**Features Tested**:
- Multi-page navigation
- Link clicking
- Login/logout flow
- State verification at each step
- Page transition handling

**Use Case**: Test complete user workflow with multiple steps

---

### 04_dynamic_content.md
**Target**: https://the-internet.herokuapp.com/dynamic_loading/1
**Complexity**: ⭐⭐⭐ Advanced
**Features Tested**:
- Dynamic content handling
- Waiting for async operations
- Negative assertions (content NOT visible initially)
- Positive assertions (content visible after loading)
- Loading state detection

**Use Case**: Test dynamic/async content handling

---

## Test Site Information

All tests use public demo sites:

### The Internet (Herokuapp)
- **URL**: https://the-internet.herokuapp.com
- **Purpose**: Popular testing site with various UI scenarios
- **Stability**: Very stable, maintained for testing
- **No Authentication Required**: Public access

### Example.com
- **URL**: https://example.com
- **Purpose**: Basic HTML page for simple tests
- **Stability**: Extremely stable (IANA reserved domain)

---

## Usage

### Run Single Test Conversion
```bash
./convert-test specs/01_simple_navigation.md
```

### Run All Tests
```bash
for spec in specs/*.md; do
  ./convert-test "$spec"
done
```

### Execute Generated Tests
```bash
# First, ensure Playwright is installed
npm install -D @playwright/test
npx playwright install

# Run generated tests
npx playwright test tests/generated/
```

---

## Adding New Test Scenarios

To add a new test scenario:

1. Create a new markdown file in this directory
2. Follow the existing format:
   ```markdown
   # Test: Name

   ## Description
   What this test validates

   ## Steps
   1. Step one
   2. Step two
   ...

   ## Expected Outcome
   What should happen
   ```
3. Be specific about:
   - URLs to visit
   - Elements to interact with
   - Text/labels to look for
   - Expected outcomes
4. Use numbered steps for clarity
5. Include any necessary credentials or data

---

## Test Naming Convention

Use this naming pattern:
```
{number}_{category}_{specific_scenario}.md
```

Examples:
- `01_simple_navigation.md`
- `02_form_interaction.md`
- `03_multi_step_workflow.md`
- `04_dynamic_content.md`

---

## Notes

- All tests use real, publicly available websites
- No mocking or stubbing
- Tests demonstrate real browser automation
- Sites chosen for stability and reliability
