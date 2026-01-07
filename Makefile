.PHONY: setup dev run clean help

# Default target
help:
	@echo "Playwright Agent Commands:"
	@echo "  make setup          - Install dependencies and setup environment"
	@echo "  make dev            - Start the UI and Backend server"
	@echo "  make run SPEC=...   - Run a specific test spec (e.g., make run SPEC=specs/login.md)"
	@echo "  make clean          - Remove temporary run artifacts"

setup:
	@./setup.sh

dev:
	@./start-ui.sh

run:
	@if [ -z "$(SPEC)" ]; then \
		echo "Error: SPEC argument is required. Usage: make run SPEC=path/to/spec.md"; \
		exit 1; \
	fi
	@source venv/bin/activate && python orchestrator/cli.py "$(SPEC)"

clean:
	@rm -rf runs/*
	@echo "Cleaned up run artifacts."
