# Outliner

This is a monorepo for the Outliner application.

## Structure

*   `server/`: This directory contains the Python-based backend for the application. It provides a RESTful API for the frontend to consume.
*   `frontend/`: This directory contains the frontend applications.
    *   `web/`: This directory contains the web frontend, built with Electron and Vite.
    *   `desktop/`: This directory contains the desktop application, which packages the web frontend.
    *   `ui/`: This directory might contain shared UI components between the web and desktop applications.

## Running Playwright Tests

To run the Playwright end-to-end tests properly, you must follow the test mode requirements:

1. **For running tests:**
   - Terminal 1: `OUTLINER_TEST_MODE=1 make clean && make run-backend`
   - Terminal 2: `OUTLINER_TEST_MODE=1 make gen-api && make test`

2. **For re-running tests:**
   - You must repeat step 1, starting with: `OUTLINER_TEST_MODE=1 make clean && make run-backend` before running `make test` again.

3. **After testing is complete, restore the original API client:**
   - Terminal 1: `OUTLINER_TEST_MODE=0 make clean && make run-backend`
   - Terminal 2: `OUTLINER_TEST_MODE=0 make gen-api`
