# Outliner Server

A backend server for the Outliner application built with FastAPI.

## Setup

1. Create a virtual environment:
   ```bash
   python -m venv env
   source env/bin/activate  # On Windows: env\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Server

```bash
python -m src.main
```

## Development Scripts

This project includes several development scripts to help maintain code quality:

### Code Formatting with Black

Format all Python code:
```bash
black src/ tests/
```

Check if code is properly formatted without making changes:
```bash
black --check src/ tests/
```

### Linting with Ruff

Check for linting issues:
```bash
ruff check src/ tests/
```

Automatically fix linting issues:
```bash
ruff check --fix src/ tests/
```

### Type Checking with mypy

Check for type errors:
```bash
mypy src/ tests/
```

### Running Tests

Run all tests:
```bash
pytest tests/
```

### Convenience Commands

Run all checks (formatting, linting, type checking):
```bash
black --check src/ tests/ && ruff check src/ tests/ && mypy src/ tests/
```

Run all automated fixes (formatting and linting):
```bash
black src/ tests/ && ruff check --fix src/ tests/
```

## Project Structure

- `src/` - Main source code
  - `main.py` - Entry point for the application
  - `api.py` - FastAPI application and routes
  - `data.py` - Database interaction layer
- `tests/` - Test files
- `requirements.txt` - Project dependencies
- `pyproject.toml` - Project configuration and metadata
