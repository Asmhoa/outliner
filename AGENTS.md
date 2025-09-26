# Agent Workflow for API and Client Generation

This document outlines the workflow for managing the API and the auto-generated TypeScript client in this project.

## Backend (Server)

The backend is a Python [FastAPI](https://fastapi.tiangolo.com/) application located in the `server/` directory.

### API Documentation and Specification

FastAPI automatically generates an OpenAPI 3.0 specification for the API.

-   **Swagger UI:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
-   **ReDoc:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
-   **OpenAPI Spec (JSON):** [http://127.0.0.1:8000/openapi.json](http://127.0.0.1:8000/openapi.json)

The server must be running to access these. To run the server:

```bash
python3 server/src/main.py
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
2.  **Run the generation script** from the `frontend/web/` directory:

    ```bash
    npm run generate-api-client
    ```

This script executes the `openapi-ts` command, which fetches the latest `openapi.json` from the running server and regenerates the client code. This ensures the frontend's API client is always in sync with the backend API.

### Frontend Component Structure

-   `frontend/ui`: This directory is intended for shared UI components (e.g., React components) that can be used across different frontend applications.
-   `frontend/web`: The web application, which consumes shared components from `frontend/ui`.
-   `frontend/desktop`: The desktop application, which also consumes shared components from `frontend/ui`.

## Server Database Structure

The server uses an SQLite database. The schema is defined in `server/src/data.py`.

### `pages` table

| Column | Type | Constraints |
|---|---|---|
| `page_id` | INTEGER | PRIMARY KEY AUTOINCREMENT |
| `title` | VARCHAR(255) | NOT NULL |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

### `blocks` table

| Column | Type | Constraints |
|---|---|---|
| `block_id` | INTEGER | PRIMARY KEY AUTOINCREMENT |
| `content` | TEXT | NOT NULL |
| `page_id` | INTEGER | NULL, FOREIGN KEY (`page_id`) REFERENCES `pages`(`page_id`) ON DELETE CASCADE |
| `parent_block_id` | INTEGER | NULL, FOREIGN KEY (`parent_block_id`) REFERENCES `blocks`(`block_id`) ON DELETE CASCADE |
| `position` | INTEGER | NOT NULL |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

**CHECK Constraint:** A block must have either a `page_id` or a `parent_block_id`, but not both. This enforces a hierarchical structure where a block is either a direct child of a page or a child of another block.