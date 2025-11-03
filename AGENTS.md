# Agent Workflow for API and Client Generation

This document outlines the workflow for managing the API and the auto-generated TypeScript client in this project.

## Makefile

The project includes a `Makefile` with several commands to streamline common development tasks.

-   `make test`: Runs the test suite.
-   `make run-backend`: Starts the development backend.
-   `make gen-api`: Regenerate the OpenAPI typespec used by the frontend based on the backend.
-   `make run-frontend`: Starts the development frontend.
-   `make clean`: Removes temporary files, such as Python cache files (`.pyc`), test caches, and log files.
-   `make format`: Format the codebase.

## Backend (Server)

The backend is a Python [FastAPI](https://fastapi.tiangolo.com/) application located in the `server/` directory.

### API Documentation and Specification

FastAPI automatically generates an OpenAPI 3.0 specification for the API.

-   **Swagger UI:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
-   **ReDoc:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
-   **OpenAPI Spec (JSON):** [http://127.0.0.1:8000/openapi.json](http://127.0.0.1:8000/openapi.json)

The server must be running to access these. Use `make dev` to start the frontend and server, or to run only the server:

```bash
cd server && uv run python -m outliner_api_server
```

### Running tests
`make test` will test all components. To test only the server:

```bash
cd server && uv run pytest
```

To check coverage, use
```bash
cd server && uv run pytest --cov
```
## Frontend (Web)

The frontend is a React+TypeScript application located in `frontend/web/`.

### Typed API Client Generation

The project uses [`openapi-ts`](https://github.com/hey-api/openapi-ts) to automatically generate a typed TypeScript client from the backend's OpenAPI specification.

-   **Generated Code Location:** `frontend/web/src/api-client/`
-   **Types:** `frontend/web/src/api-client/types.gen.ts`
-   **API Services:** `frontend/web/src/api-client/sdk.gen.ts`

### How to Update the API Client

To update the client after making changes to the FastAPI application:

1.  **Ensure the backend server is running.**
2.  **Run the generation script**

    ```bash
    cd frontend/web/ && npm run generate-api-client
    ```

This script executes the `openapi-ts` command, which fetches the latest `openapi.json` from the running server and regenerates the client code. This ensures the frontend's API client is always in sync with the backend API.

## Database Management

The application supports tracking multiple user databases through a SystemDatabase. Each request can specify which UserDatabase to use via a path parameter:

- `GET /db/{db_name}/pages` - Get all pages from a specific database
- `GET /db/{db_name}/pages/{page_id}` - Get a specific page from a specific database
- `POST /db/{db_name}/pages` - Create a page in a specific database
- And so on for all other endpoints

This allows the same server instance to handle multiple UserDatabases, enabling users to open different databases in different browser windows.

### Technical Implementation

FastAPI automatically passes path parameters to dependency functions. Example:

```python
def get_db(db_name: str, request: Request):
    # db_name is automatically injected from the route path
    sys_db = request.app.state.sys_db
    # ... get database by name ...
    yield db

@app.get("/db/{db_name}/pages")
def get_pages(db_name: str, db: UserDatabase = Depends(get_db)):
    # db_name is passed to get_db dependency automatically
    pass
```

### Running Playwright Tests

The frontend includes Playwright tests for end-to-end testing. To run these tests:

1. Navigate to the frontend web directory:
   ```bash
   cd frontend/web
   ```

2. Install Playwright browsers (needed for first run):
   ```bash
   npm install playwright/tests --with-deps
   ```

3. Run all Playwright tests:
   ```bash
   npx playwright test
   ```

4. To run tests in headed mode (to see the browser):
   ```bash
   npx playwright test --headed
   ```

5. To run tests for a specific browser:
   ```bash
   npx playwright test --project=chromium
   npx playwright test --project=firefox
   npx playwright test --project=webkit
   ```

6. To run a specific test file:
   ```bash
   npx playwright test tests/basic.spec.ts
   ```

7. To view the HTML test report after running tests:
   ```bash
   npx playwright show-report
   ```

The Playwright configuration is set up to:
- Run tests in parallel
- Use http://localhost:5173 as the base URL
- Automatically start the dev server with `npm run dev` before running tests
- Generate an HTML reporter
- Retry failed tests on CI environments

### Frontend Component Structure

-   `frontend/ui`: This directory is intended for shared UI components (e.g., React components) that can be used across different frontend applications.
-   `frontend/web`: The web application, which consumes shared components from `frontend/ui`.
-   `frontend/desktop`: The desktop application, which also consumes shared components from `frontend/ui`.

## Code Location Preference

When implementing features or making changes, prefer handling logic and data manipulation as low in the stack as possible. For example, path sanitization should occur in the database code rather than the frontend. This ensures that any consumers of the API or database code directly also benefit from these implementations, promoting consistency and reducing duplication.

## API Error Handling

When making changes to the API, prefer using custom error classes for error handling rather than boolean flags to indicate success/failure.

For example, instead of returning `{"success": false, "error": "Page not found"}`, the API should raise specific exceptions like `PageNotFoundError` which are then caught and converted to properly structured HTTP responses with appropriate status codes. The `api.py` file should be responsible for catching these exceptions and returning the appropriate HTTP status codes and error messages.
