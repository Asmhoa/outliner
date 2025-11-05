# Outliner API Server

This is the backend API server for the Outliner application.

## Description

The Outliner API Server is a FastAPI-based web server that provides REST APIs for managing pages, blocks, and workspaces for the Outliner application.

## Features

- REST API endpoints for managing pages, blocks, and workspaces
- SQLite database for data persistence
- CORS support for web frontend integration

## Endpoints

- `/pages` - Manage pages
- `/blocks` - Manage content blocks
- `/workspaces` - Manage workspaces

## Running the Server

To run the server locally, use:

```bash
make run-backend
```

Or directly with uv:

```bash
cd server && uv run src/outliner_api_server/__main__.py
```

## Development

For development, make sure you have `uv` installed and run:

```bash
make setup
```

## Testing

To run all tests for the server, use:

```bash
cd server && uv run pytest --cov=src/outliner_api_server
```