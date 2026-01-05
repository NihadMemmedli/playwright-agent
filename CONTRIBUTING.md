# Contributing to Test Script Converter

Thank you for your interest in contributing! We welcome community involvement to make this tool better.

## How to Contribute

1.  **Fork the repository** on GitHub.
2.  **Clone your fork** locally.
3.  **Create a branch** for your feature or fix (`git checkout -b feature/amazing-feature`).
4.  **Make your changes**.
5.  **Run tests** to ensure no regressions:
    ```bash
    # Run the simple navigation test to verify pipeline integrity
    ./convert-test specs/01_simple_navigation.md
    ```
6.  **Commit your changes** (`git commit -m 'Add some amazing feature'`).
7.  **Push to the branch** (`git push origin feature/amazing-feature`).
8.  **Open a Pull Request**.

## Reporting Issues

If you find a bug or have a suggestion, please open an issue on GitHub. Include:
-   Steps to reproduce
-   Expected vs. actual behavior
-   Your environment (OS, Python version, Node version)

## Development Setup

See the `README.md` for full installation instructions.

### Architecture Overview

-   `orchestrator/workflows/planner.py`: Spec -> Plan (JSON)
-   `orchestrator/workflows/operator.py`: Plan -> Execution Trace (Playwright MCP)
-   `orchestrator/workflows/exporter.py`: Trace -> Code (TypeScript)
-   `orchestrator/workflows/validator.py`: Code -> Validated Code
