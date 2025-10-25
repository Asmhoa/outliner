# Makefile for Outliner project

# Default target
.DEFAULT_GOAL := help

# Projects
SERVER_DIR := server
SERVER_PID_FILE = $(SERVER_DIR)/running.pid
WEB_FRONTEND_DIR := frontend/web

# Help target
.PHONY: help
help: ## Show this help message
	@echo "Outliner Project Makefile"
	@echo ""
	@echo "Available targets:"
	@echo ""
	@grep -E '^[a-zA-Z_0-9%-]+:.*?## .*$$' $(word 1,$(MAKEFILE_LIST)) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "%-30s %s\n", $$1, $$2}'

# Setup the development environment
.PHONY: setup
setup: ## Install dependencies using uv
	@echo "Setting up development environment..."
	@if ! command -v uv &> /dev/null; then \
		echo "Error: uv is not installed. Please install uv by following the instructions at https://github.com/astral-sh/uv?tab=readme-ov-file#installation"; \
		exit 1; \
	fi
	## TODO: add setup npm

.PHONY: run-backend
run-backend:
	@echo "Starting backend API server..."
	@cd $(SERVER_DIR) && uv run src/outliner_api_server/__main__.py

.PHONY: run-frontend
run-frontend:
	@echo "Starting backend API server..."
	@cd $(WEB_FRONTEND_DIR) && npm run dev

# Regenerate the OpenAPI typespec
.PHONY: gen-api
gen-api: ## Launch the backend API server in development mode
	@echo "The backend server should be running for this (make run-backend)..."
	@cd $(WEB_FRONTEND_DIR) && npm run generate-api-client

# # Format Python code
# .PHONY: format
# format: ## Format Python code using black and ruff
# 	@echo "Formatting Python code..."
# 	@if [ -f "$(VENV_PATH)/bin/black" ]; then \
# 		$(VENV_PATH)/bin/black $(SERVER_DIR)/src $(SERVER_DIR)/tests; \
# 	else \
# 		echo "black not found, installing with pip..."; \
# 		$(PIP) install black; \
# 		$(VENV_PATH)/bin/black $(SERVER_DIR)/src $(SERVER_DIR)/tests; \
# 	fi
# 	@if [ -f "$(VENV_PATH)/bin/ruff" ]; then \
# 		$(VENV_PATH)/bin/ruff check --fix $(SERVER_DIR)/src $(SERVER_DIR)/tests; \
# 		$(VENV_PATH)/bin/ruff format $(SERVER_DIR)/src $(SERVER_DIR)/tests; \
# 	else \
# 		echo "ruff not found, installing with pip..."; \
# 		$(PIP) install ruff; \
# 		$(VENV_PATH)/bin/ruff check --fix $(SERVER_DIR)/src $(SERVER_DIR)/tests; \
# 		$(VENV_PATH)/bin/ruff format $(SERVER_DIR)/src $(SERVER_DIR)/tests; \
# 	fi

# # Check code formatting
# .PHONY: check-format
# check-format: ## Check if the code is properly formatted
# 	@echo "Checking code formatting..."
# 	@if [ -f "$(VENV_PATH)/bin/black" ]; then \
# 		$(VENV_PATH)/bin/black --check $(SERVER_DIR)/src $(SERVER_DIR)/tests; \
# 	else \
# 		echo "black not found, installing with pip..."; \
# 		$(PIP) install black; \
# 		$(VENV_PATH)/bin/black --check $(SERVER_DIR)/src $(SERVER_DIR)/tests; \
# 	fi
# 	@if [ -f "$(VENV_PATH)/bin/ruff" ]; then \
# 		$(VENV_PATH)/bin/ruff check $(SERVER_DIR)/src $(SERVER_DIR)/tests; \
# 	else \
# 		echo "ruff not found, installing with pip..."; \
# 		$(PIP) install ruff; \
# 		$(VENV_PATH)/bin/ruff check $(SERVER_DIR)/src $(SERVER_DIR)/tests; \
# 	fi

# Run tests
.PHONY: test
test: ## Run tests
	@echo "Running tests..."
	@cd $(SERVER_DIR) && uv run pytest tests/
	@cd ../
	@cd $(WEB_FRONTEND_DIR) && npx playwright test

# Clean temporary files
.PHONY: clean
clean: ## Clean temporary files and cache
	@echo "Cleaning temporary files..."
	@find . -type f -name "*.pyc" -delete
	@find . -type d -name "__pycache__" -delete
	@find . -type f -name ".DS_Store" -delete
	@rm -rf $(SERVER_DIR)/.pytest_cache
	@rm -f $(SERVER_DIR)/server.log
	@rm -f $(SERVER_DIR)/*.db
	@rm -f $(SERVER_DIR)/src/**/*.db


# # Define variables
# .PHONY: run stop clean
# VENV ?= .venv
#

# # Check if a virtual environment exists. If not, inform the user.
# $(VENV)/bin/python:
# 	@echo "Virtual environment not found. Please run 'make venv' first."
# 	@exit 1

# # Target to create and install dependencies into a virtual environment
# venv:
# 	python3 -m venv $(VENV)
# 	$(VENV)/bin/pip install fastapi uvicorn

# # Target to clean up generated files
# clean:
# 	@echo "Cleaning up..."
# 	@rm -f $(PID_FILE)
# 	@rm -rf $(VENV)
