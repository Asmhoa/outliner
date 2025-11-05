# Makefile for Outliner project

# Default target
.DEFAULT_GOAL := help

# Function to read constants from outliner_api_server.constants
# Hacky, but bypasses installing the package
define get_constant
$(shell uv run python -c 'import server.src.outliner_api_server.constants as c; print(c.$1)')
endef

define get_is_testing
$(shell uv run python -c 'from server.src.outliner_api_server.utils import is_test_env; print(int(is_test_env()))')
endef

SERVER_PORT := $(call get_constant,SERVER_PORT)
TESTING_PORT := $(call get_constant,TESTING_PORT)
TESTING_SYSTEM_DB_NAME := $(call get_constant,TESTING_SYSTEM_DB_NAME)
SERVER_DIR := server
WEB_FRONTEND_DIR := frontend/web

# 0 or 1
IS_TEST_ENV := $(call get_is_testing)

# Help target
.PHONY: help
help: ## Show this help message
	@echo "Outliner Project Makefile"
	@echo ""
	@echo "Available targets:"
	@echo ""
	@grep -E '^[a-zA-Z_0-9%-]+:.*?## .*$$' $(word 1,$(MAKEFILE_LIST)) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "%-30s %s\n", $$1, $$2}'

# # Setup the development environment
# .PHONY: setup
# setup: ## Install dependencies using uv
# 	@echo "Setting up development environment..."
# 	@if ! command -v uv &> /dev/null; then \
# 		echo "Error: uv is not installed. Please install uv by following the instructions at https://github.com/astral-sh/uv?tab=readme-ov-file#installation"; \
# 		exit 1; \
# 	fi
# 	## TODO: add setup npm

.PHONY: run-backend
run-backend:
	@echo "Starting backend API server..."
	@cd $(SERVER_DIR) && OUTLINER_TEST_MODE=${OUTLINER_TEST_MODE} uv run src/outliner_api_server/__main__.py

.PHONY: run-frontend
run-frontend:
	@echo "Starting backend API server..."
	@cd $(WEB_FRONTEND_DIR) && npm run dev

ifeq ($(IS_TEST_ENV),1)
API_GEN_PORT := $(TESTING_PORT)
else
API_GEN_PORT := $(SERVER_PORT)
endif
.PHONY: gen-api
gen-api: ## Regenerate the OpenAPI typespec used by the frontend

	@if ! curl --output /dev/null --silent --head --fail http://localhost:$(API_GEN_PORT)/docs; then \
		echo "\nBackend server not detected. Please start the backend server first."; \
		echo "For testing, use OUTLINER_TEST_MODE=1 with both 'make run-backend' and 'make gen-api'\n"; \
		exit 1; \
	fi;

	@if [ $$IS_TEST_ENV ]; then \
		cd $(WEB_FRONTEND_DIR) && npm run generate-api-client-test-port-8001; \
	else \
		cd $(WEB_FRONTEND_DIR) && npm run generate-api-client; \
	fi

# Format Python code
.PHONY: format
format:
	@echo "Formatting Python code..."
	@cd $(SERVER_DIR) && uv run --with ruff ruff check --fix src tests
	@cd $(SERVER_DIR) && uv run --with ruff ruff format src tests

# @cd $(SERVER_DIR) && uv run pytest --cov
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

.PHONY: pytests
pytests:
	@cd $(SERVER_DIR) && uv run pytest --cov
	@cd ../

# Run tests with test-specific API client
.PHONY: test
test:
	@echo "Running pytests..."
	@$(MAKE) pytests

	@if ! curl --output /dev/null --silent --head --fail http://localhost:$(TESTING_PORT)/docs; then \
		echo "\nFor playwright tests, first run OUTLINER_TEST_MODE=1 make clean && make run-backend"; \
		echo "In another terminal, run OUTLINER_TEST_MODE=1 make gen-api && make test\n"; \
		exit 1; \
	fi;

	@echo "Running playwright tests..."
	@cd $(WEB_FRONTEND_DIR) && npm run test

# Clean temporary files
.PHONY: clean
clean: ## Clean temporary files and cache
	@echo "Cleaning temporary files..."
	@find . -type f -name "*.pyc" -delete
	@find . -type d -name "__pycache__" -delete
	@find . -type f -name ".DS_Store" -delete
	@rm -rf $(SERVER_DIR)/.pytest_cache
	@rm -f $(SERVER_DIR)/server.log
	@rm -f $(SERVER_DIR)/src/outliner_api_server/databases/playwright_test_db.db
	@rm -f $(SERVER_DIR)/src/outliner_api_server/databases/$(TESTING_SYSTEM_DB_NAME)
