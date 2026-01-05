# Future Feature Roadmap

This document outlines the strategic plan for evolving the `playwright-agent` from a prototype script into a robust, production-grade tool.

## 📦 Phase 1: Developer Experience (CLI & Packaging)

Currently, the tool runs via `orchestrator_runner.py` and requires manual venv setup.
- **Goal**: Make installation and usage as simple as `pip install playwright-agent`.
- **Tasks**:
    - [ ] Create `setup.py` / `pyproject.toml` for Python packaging.
    - [ ] Replace `orchestrator_runner.py` with a proper CLI entry point (using `argparse` or `click`).
    - [ ] Embed `orchestrator` as a package.
    - [ ] Automate venv management (or remove the need for it by proper package installation).

## 🗣️ Phase 2: Interactive Mode

The tool is currently batch-oriented (read file -> run).
- **Goal**: Allow users to guide the agent in real-time.
- **Tasks**:
    - [ ] specific "Interactive" flag where the agent pauses and asks for confirmation before critical actions.
    - [ ] "Refinement" mode: After the Plan stage, present the plan to the user for editing before Execution.

## 🔬 Phase 3: Observability & Debugging

- **Goal**: Make it easier to understand *why* a test failed or what the agent was thinking.
- **Tasks**:
    - [ ] **Visual Trace**: Generate a GIF or Video of the agent's interaction during the "Operator" phase.
    - [ ] **HTML Report**: Enhance the output to include a rich HTML report with step-by-step logs and screenshots (building on Playwright's built-in reporter).

## 🛠️ Phase 4: Reliability & Self-Healing

- **Goal**: Reduce flakiness in generated tests.
- **Tasks**:
    - [ ] **Smart Retries**: If a selector fails, the agent should try to find an alternative selector strategy automatically during the "Validator" phase.
    - [ ] **Heuristic Analysis**: Analyze the page DOM to suggest more robust selectors (e.g., `data-testid`).

## 🐳 Phase 5: Deployment & Integrations

- **Goal**: Run anywhere.
- **Tasks**:
    - [ ] **Docker Image**: Pre-packaged image with Python, Node, and Browsers installed.
    - [ ] **CI Integrations**: GitHub Action / GitLab CI template to run `playwright-agent` as part of a pipeline.
