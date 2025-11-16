# Project Architecture and Development Guidelines

This document outlines the key architectural patterns and development best practices for the Outliner project.

## Project Structure

The project follows a client-server architecture with a clear separation between frontend and backend:

- `server/` - Python FastAPI application implementing the backend API and database management
- `frontend/web/` - React+TypeScript application for the web interface
- `frontend/ui/` - Shared UI components (planned for future use)
- `frontend/desktop/` - Desktop application structure (planned for future use)

## Backend Architecture

The backend is built with Python FastAPI and implements a dual database system:

### Database Architecture
- **SystemDatabase**: Manages the list of UserDatabases, maintains database metadata, and provides path sanitization to prevent directory traversal attacks
- **UserDatabase**: Individual user databases that store application data (workspaces, pages, and blocks) using SQLite files

### API Design
- All content management endpoints follow the pattern `/db/{db_id}/resource` where `db_id` specifies the user database
- The backend uses FastAPI's dependency injection for proper database connection management
- Custom exception classes are used for error handling rather than boolean flags (e.g., `PageNotFoundError`, `UserDatabaseNotFoundError`)

### Code Location Preference
Prefer implementing logic and data manipulation as low in the stack as possible. For example, path sanitization occurs in the database layer rather than in the frontend, ensuring all API consumers benefit from these implementations.

## Frontend Architecture

The frontend is a React+TypeScript application using modern tooling:

- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **UI Library**: Mantine
- **State Management**: React Context API for database context and local state management

### API Client Generation
The project uses `@hey-api/openapi-ts` to automatically generate a typed TypeScript client from the backend's OpenAPI specification:
- Generated code is located in `frontend/web/src/api-client/`
- The client must be regenerated after backend API changes using `make gen-api` or `npm run generate-api-client`

## Development Commands

The project includes a Makefile with common development tasks:

- `make test`: Runs the complete test suite
- `make run-backend`: Starts the development backend
- `make gen-api`: Regenerates the OpenAPI typespec used by the frontend
- `make run-frontend`: Starts the development frontend
- `make clean`: Removes temporary files
- `make format`: Formats the codebase