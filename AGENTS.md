# Agent Workflow for Outliner

This document outlines the workflow for managing the backend (api server) and frontend (react) for the outliner project.

## Makefile

The project includes a `Makefile` with several commands to streamline common development tasks.

-   `make test`: Runs the test suite.
-   `make run-backend`: Starts the development backend.
-   `make gen-api`: Regenerate the OpenAPI typespec used by the frontend based on the backend.
-   `make run-frontend`: Starts the development frontend.
-   `make clean`: Removes temporary files, such as Python cache files (`.pyc`), test caches, and log files.
-   `make format`: Format the codebase.

## Backend (API Server)

The backend is a TypeScript [Express](https://expressjs.com/) application located in the `packages/backend/` directory. It provides REST APIs for managing pages, blocks, and workspaces using a SQLite database for data persistence.

### Running the backend

Use `pnpm --filter @outliner/backend dev` to start the development server, or:

```bash
cd packages/backend && pnpm dev
```

### Running tests
`make test` will test all components. To test only the backend:

```bash
cd packages/backend && npm run test
```

To run tests in watch mode:
```bash
cd packages/backend && npm run test:watch
```
## Frontend (Web)

The frontend is a React+TypeScript+Vite application located in `packages/frontend/`.

## Database Management

The application supports tracking multiple user databases through a SystemDatabase using SQLite. Each request can specify which UserDatabase to use via a path parameter:

- `GET /db/{db_name}/pages` - Get all pages from a specific database
- `GET /db/{db_name}/pages/{page_id}` - Get a specific page from a specific database
- `POST /db/{db_name}/pages` - Create a page in a specific database
- And so on for all other endpoints

This allows the same server instance to handle multiple UserDatabases, enabling users to open different databases in different browser windows.

### Technical Implementation

The backend uses Express middleware and route parameters to handle database selection. Example:

```typescript
app.get('/db/:dbName/pages', (req: Request, res: Response) => {
  const dbName = req.params.dbName;
  // Get database by name from system database
  const db = getDatabaseByName(dbName);
  // ... perform operations on selected database ...
});
```

## Monorepo Structure

The project follows a monorepo architecture using pnpm workspaces with the following packages:

-   `packages/backend`: TypeScript/Express API server
-   `packages/frontend`: React+TypeScript web application
-   `packages/shared`: Shared utilities, types, and interfaces

## Code Location Preference

When implementing features or making changes, prefer handling logic and data manipulation as low in the stack as possible. For example, path sanitization should occur in the database code rather than the frontend. This ensures that any consumers of the API or database code directly also benefit from these implementations, promoting consistency and reducing duplication.

## API Error Handling

When making changes to the API, prefer using custom error classes for error handling rather than boolean flags to indicate success/failure.

For example, instead of returning `{"success": false, "error": "Page not found"}`, the API should raise specific exceptions like `NotFoundError` which are then caught and converted to properly structured HTTP responses with appropriate status codes. The error handling middleware should be responsible for catching these exceptions and returning the appropriate HTTP status codes and error messages.
