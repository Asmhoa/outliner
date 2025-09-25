# Outliner

This is a monorepo for the Outliner application.

## Structure

*   `server/`: This directory contains the Python-based backend for the application. It provides a RESTful API for the frontend to consume.
*   `frontend/`: This directory contains the frontend applications.
    *   `web/`: This directory contains the web frontend, built with Electron and Vite.
    *   `desktop/`: This directory contains the desktop application, which packages the web frontend.
    *   `ui/`: This directory might contain shared UI components between the web and desktop applications.
