# Makefile for Outliner project

# Default target
.DEFAULT_GOAL := help

# Function to read constants from outliner_api_server.constants
# Hacky, but bypasses installing the package
define get_constant
$(shell uv run python -c 'import server.src.outliner_api_server.constants as c; print(c.$1)')
endef

SERVER_PORT := $(call get_constant,SERVER_PORT)
TESTING_SERVER_PORT := $(call get_constant,TESTING_PORT)
TESTING_SYSTEM_DB_NAME := $(call get_constant,TESTING_SYSTEM_DB_NAME)
SERVER_DIR := server
WEB_FRONTEND_DIR := packages/frontend


.PHONY: help
help: ## Show this help message
	@echo "Outliner Project Makefile"
	@echo ""
	@echo "Available targets:"
	@echo ""
	@grep -E '^[a-zA-Z_0-9%-]+:.*?## .*$$' $(word 1,$(MAKEFILE_LIST)) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "%-30s %s\n", $$1, $$2}'

.PHONY: run-backend
run-backend: ## Run backend and occupy the process
	@echo "Starting backend API server..."
	@cd $(SERVER_DIR) && uv run src/outliner_api_server/__main__.py

.PHONY: gen-api
gen-api: ## Regenerate the OpenAPI typespec used by the frontend
	@if ! curl --output /dev/null --silent --head --fail http://localhost:$(SERVER_PORT)/docs; then \
		echo "\nBackend server not detected. Please start the backend server first."; \
		exit 1; \
	fi; \
	cd $(WEB_FRONTEND_DIR) && npm run generate-api-client;

.PHONY: run-frontend
run-frontend: ## Run after run-backend (in a different terminal)
	@$(MAKE) gen-api
	@echo "Starting backend API server..."
	@cd $(WEB_FRONTEND_DIR) && npm run dev

# Format Python code
.PHONY: format
format:
	@echo "Formatting Python code..."
	@cd $(SERVER_DIR) && uv run --with ruff ruff check --fix src tests
	@cd $(SERVER_DIR) && uv run --with ruff ruff format src tests
	@cd $(WEB_FRONTEND_DIR) && npm run lint

.PHONY: clean
clean:
	@echo "Cleaning temporary files..."
	@find . -type f -name "*.pyc" -delete
	@find . -type d -name "__pycache__" -delete
	@find . -type f -name ".DS_Store" -delete
	@rm -rf $(SERVER_DIR)/.pytest_cache
	@rm -f $(SERVER_DIR)/src/outliner_api_server/databases/playwright_test_db.db
	@rm -f $(SERVER_DIR)/src/outliner_api_server/databases/$(TESTING_SYSTEM_DB_NAME)


# Testing specific targets
.PHONY: pytests
pytests:
	@cd $(SERVER_DIR) && uv run pytest --cov

.PHONY: .run-backend-for-tests
.run-backend-for-tests: ## Run backend and move it to background process
		@echo "Starting backend API server..."
		@cd $(SERVER_DIR) && OUTLINER_TEST_MODE=${OUTLINER_TEST_MODE} LOG_LEVEL=error uv run src/outliner_api_server/__main__.py &
		@sleep 5

.PHONY: .gen-api-for-tests
.gen-api-for-tests: ## Regenerate the OpenAPI typespec from TESTING_SERVER_PORT, used by tests
	@if ! curl --output /dev/null --silent --head --fail http://localhost:$(TESTING_SERVER_PORT)/docs; then \
		echo "\nBackend server not detected. Please start the backend server first."; \
		exit 1; \
	fi; \
	cd $(WEB_FRONTEND_DIR) && npm run generate-api-client-test-port;

.PHONY: .kill-test-server
.kill-test-server: ## Kill outliner process on TESTING_SERVER_PORT. Inform user of other process on port.
	@echo "Killing running test server (ignore any [make error 137] errors) ..."
	@SERVER_PID=$$(lsof -ti:$(TESTING_SERVER_PORT)); \
	if [ -n "$$SERVER_PID" ]; then \
		PROCESS=`ps | grep "$$SERVER_PID" | grep "outliner_api_server"`; \
    	if [ -n "$$PROCESS" ]; then \
    		kill -9 $$SERVER_PID; \
    	else \
    		echo "A process is already running on testing port $(TESTING_SERVER_PORT)."; \
            echo "Stop it to continue: \"kill -9 $$SERVER_PID && make test\"\n"; \
            exit 2; \
    	fi; \
    fi


.PHONY: test
test:
	@$(MAKE) clean
	@$(MAKE) .kill-test-server

	@echo "Running pytests..."
	@$(MAKE) pytests

	@$(MAKE) OUTLINER_TEST_MODE=1 .run-backend-for-tests
	@$(MAKE) .gen-api-for-tests

	@echo "Running playwright tests..."
	@cd $(WEB_FRONTEND_DIR) && npm run test

	@$(MAKE) .kill-test-server
	@$(MAKE) clean
