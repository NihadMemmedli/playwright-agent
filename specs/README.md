# Test Specifications

This directory contains the natural language test specifications that drive the generation pipeline.

## Available Scenarios

### 01_simple_navigation.md
-   **Target**: `example.com`
-   **Focus**: Basic navigation, title verification, visibility checks.
-   **Complexity**: Low

### 02_form_interaction.md
-   **Target**: `the-internet.herokuapp.com/login`
-   **Focus**: Input extraction (username/password), button clicks, successful login verification.
-   **Complexity**: Medium

### 03_multi_step_workflow.md
-   **Target**: `the-internet.herokuapp.com/login`
-   **Focus**: Full session lifecycle: Login -> Verify Secure Area -> Logout -> Verify Login Page. Tests state persistence and navigation flow.
-   **Complexity**: High

### 04_dynamic_content.md
-   **Target**: `the-internet.herokuapp.com/dynamic_loading/1`
-   **Focus**: Handling asynchronous content loading. Verifies "Loading..." states and eventual element visibility without hardcoded waits.
-   **Complexity**: High

### 05_ecommerce_workflow.md
-   **Target**: `demoblaze.com`
-   **Focus**: Complex user journey: Home -> Product -> Add to Cart -> Cart Page -> Verify Item. Handles alerts and page transitions.
-   **Complexity**: High

### 06_form_validation.md
-   **Target**: `practicetestautomation.com`
-   **Focus**: Negative testing. Verifies that invalid credentials trigger the correct error messages.
-   **Complexity**: Medium

### 07_ui_controls.md
-   **Target**: `the-internet.herokuapp.com`
-   **Focus**: Form elements: Checkboxes (toggle state) and Dropdowns (select option).
-   **Complexity**: Medium

## Usage

Run a specific spec:
```bash
./convert-test specs/01_simple_navigation.md
```

Run all specs:
```bash
for f in specs/*.md; do ./convert-test "$f"; done
```
