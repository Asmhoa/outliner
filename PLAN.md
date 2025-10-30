# Database Switching Feature Implementation Plan

## Problem Statement

### Current Limitations
The outliner application currently has a **hardcoded database path** (`server/src/outliner_api_server/data.db`), which creates several pain points for users:

1. **No Organization by Context**: Users cannot separate their notes by different contexts (e.g., work projects, personal notes, different clients, or separate knowledge bases). All pages and blocks live in a single database regardless of their purpose.

2. **No Data Isolation**: Users who want to keep different types of content separate (e.g., confidential work notes vs. personal journal entries) have no way to create logical boundaries between their data.

3. **Difficult Multi-Project Workflows**: Users working on multiple projects simultaneously cannot easily switch between project-specific outlines without mixing unrelated content.

4. **Limited Sharing Options**: Users cannot easily share a specific database file with collaborators while keeping other databases private. The single database contains everything.

5. **No Testing Environment**: Users cannot safely experiment with the application or test features without risking their production notes. There's no way to create a separate "sandbox" database.

6. **Backup and Migration Challenges**: Users cannot selectively backup or migrate specific collections of pages. It's all-or-nothing with the single database file.

7. **Poor Developer Experience**: Developers working on the application must manually edit code or swap database files to test different data scenarios, making development and debugging more difficult.

### User Impact
Without database switching, users are forced to:
- Mix unrelated content in a single namespace
- Manually copy/rename database files at the filesystem level to switch contexts
- Risk data loss when experimenting with features
- Lose productivity from context switching between unrelated pages
- Give up on using the tool for multiple separate use cases

## Solution Overview
Implement a database switching feature allowing users to manage multiple databases with names and relative paths, persisted in a special config database, with per-request database selection for concurrency safety.

---

## 1. Backend: Configuration Database Manager
**File:** `server/src/outliner_api_server/config_db.py` (new)
- Create `ConfigDatabase` class to manage database registry
- Store in `~/.outliner/config.db` with table: `databases(id, name, relative_path, created_at, last_used_at)`
- Methods: `add_database()`, `list_databases()`, `get_database()`, `remove_database()`, `update_last_used()`
- Base directory: `~/.outliner/databases/` for all user databases
- Auto-create default database if none exists

## 2. Backend: Update Database Class
**File:** `server/src/outliner_api_server/data.py`
- Keep existing `Database` class unchanged (already accepts path parameter)
- Add utility function `resolve_database_path(db_id)` to convert DB ID → absolute path

## 3. Backend: New API Endpoints
**File:** `server/src/outliner_api_server/api.py`
- `GET /databases` - List all registered databases (name, id, path, last_used)
- `POST /databases` - Register new database (name, relative_path)
- `DELETE /databases/{db_id}` - Remove database from registry
- `GET /databases/{db_id}/validate` - Check if database file exists and is valid

## 4. Backend: Modify Dependency Injection
**File:** `server/src/outliner_api_server/api.py`
- Update `get_db()` to accept optional `db_id` query parameter
- If `db_id` provided, resolve path from config database
- If not provided, use last_used database from config
- Each request independently resolves database (concurrent-safe)
- Update all existing endpoints to accept optional `?db_id=<id>` query param

## 5. Backend: Update Lifespan Handler
**File:** `server/src/outliner_api_server/api.py`
- Initialize config database on startup
- Ensure base directory `~/.outliner/databases/` exists
- Create default database if registry is empty

## 6. Frontend: Update API Client
**Files:** `frontend/web/src/api-client/*.gen.ts`
- Run `make gen-api` to regenerate client with new database endpoints
- Auto-generates TypeScript types for database operations

## 7. Frontend: Add Database Context
**File:** `frontend/web/src/contexts/DatabaseContext.tsx` (new)
- Create React Context for current database selection
- Store current `db_id` in localStorage
- Provide `currentDatabase`, `setCurrentDatabase()`, `databases`, `refreshDatabases()`
- Load from localStorage on mount, fetch database list from API

## 8. Frontend: Update API Client Wrapper
**File:** `frontend/web/src/hooks/useApiClient.ts` (new)
- Create custom hook that wraps API client
- Automatically append `db_id` query param to all requests
- Use `currentDatabase` from context

## 9. Frontend: Update Database Switcher UI
**File:** `frontend/web/src/components/sidebar/LeftSidebar.tsx`
- Connect dropdown to actual database list from context
- Show database name + path in menu items
- Add "New Database" option to create new database
- Add delete option (with confirmation) for databases
- Highlight currently active database

## 10. Frontend: Update App Component
**File:** `frontend/web/src/App.tsx`
- Wrap app with `DatabaseContextProvider`
- Replace all direct API calls with `useApiClient` hook
- Reload pages when database switches

## 11. Frontend: Add Database Creation Modal
**File:** `frontend/web/src/components/modals/CreateDatabaseModal.tsx` (new)
- Form with fields: database name, optional relative path
- Validation: name required, path defaults to `<sanitized-name>.db`
- Call `POST /databases` API endpoint
- Switch to new database after creation

## 12. Testing: Backend Tests
**File:** `server/tests/unit/test_config_db.py` (new)
- Test config database CRUD operations
- Test path resolution logic
- Test default database creation

**File:** `server/tests/component/test_api.py` (update)
- Test new database endpoints
- Test `db_id` query parameter on existing endpoints
- Test concurrent requests with different databases

## 13. Testing: Frontend Tests
**File:** `frontend/web/tests/database-switching.spec.ts` (new)
- Test database dropdown displays correctly
- Test creating new database
- Test switching between databases
- Test localStorage persistence

## 14. Documentation
**File:** `CLAUDE.md` (update)
- Document database switching feature
- Document config database location
- Add Makefile commands if needed

---

## Implementation Order
1. Backend config database (steps 1, 5)
2. Backend API endpoints (steps 3, 4)
3. Backend tests (step 12)
4. Frontend context & hooks (steps 7, 8)
5. Frontend UI updates (steps 9, 10, 11)
6. Frontend tests (step 13)
7. Regenerate API client (step 6)
8. Documentation (step 14)

## Key Design Decisions
✅ **Concurrency-safe**: Per-request database selection via query parameter
✅ **User-friendly**: Named databases with relative paths in organized directory
✅ **Persistent**: Config database tracks all registered databases
✅ **Frontend state**: localStorage remembers last selection per browser
✅ **Backwards compatible**: Existing code works with default database
