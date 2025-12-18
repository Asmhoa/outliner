# Database Connection Guide for TypeScript Backend

## Overview

The new TypeScript backend uses the `better-sqlite3` library for SQLite database operations, which provides a more convenient and efficient API compared to the original Python implementation. This guide explains how to connect to and work with the database in the new backend.

## Key Differences from Python Implementation

### Python (Original)
- Manual management of `conn` and `cursor` objects
- Explicit `conn.commit()` calls for transactions
- Manual connection handling with `check_same_thread=False`

### TypeScript (New)
- Automatic connection management through `better-sqlite3`
- No manual cursor management required
- Simplified API with prepared statements
- Automatic resource management

## How to Connect to the Database

### 1. Direct Database Connection

The database connection is established automatically when you instantiate a database class:

```typescript
import { UserDatabase } from './database/user';
import { SystemDatabase } from './database/system';

// Connect to a user database
const userDb = new UserDatabase('path/to/user.db');

// Connect to system database
const systemDb = new SystemDatabase('path/to/system.db');
```

### 2. Using Services (Recommended)

The recommended approach is to use the service layer which handles database connections automatically:

```typescript
import { DatabaseService, UserDatabaseService } from './services';

// Use DatabaseService to manage system database operations
const dbService = new DatabaseService('system.db');

// Get a UserDatabaseService for specific database operations
const userDbService = dbService.getUserDatabaseService('database-id');
```

### 3. Working with Prepared Statements

The `better-sqlite3` library uses prepared statements for all operations:

```typescript
// Example: Adding a page to the database
addPage(title: string): number {
  const stmt = this.db.prepare(`
    INSERT INTO pages (title)
    VALUES (?)
  `);

  const result = stmt.run(title);
  return result.lastInsertRowid as number;
}

// Example: Querying data
getPageById(id: number): Page | null {
  const stmt = this.db.prepare(`
    SELECT id, title, workspace_id as workspaceId,
           created_at as createdAt, updated_at as updatedAt
    FROM pages
    WHERE id = ?
  `);

  const result = stmt.get(id) as Page | undefined;
  return result || null;
}
```

## Database Classes

### UserDatabase
Handles operations for a specific user's data (pages, blocks, workspaces):

```typescript
import { UserDatabase } from './database/user';

const userDb = new UserDatabase('/path/to/user.db');
// Use methods like addPage(), getPageById(), etc.
// Remember to close when done
userDb.close();
```

### SystemDatabase
Manages the list of user databases available to the application:

```typescript
import { SystemDatabase } from './database/system';

const sysDb = new SystemDatabase('/path/to/system.db');
// Use methods like addUserDatabase(), getUserDatabaseById(), etc.
// Remember to close when done
sysDb.close();
```

## Resource Management

The new backend properly handles resource cleanup:

```typescript
// In route handlers, always close connections in finally blocks
let dbService: DatabaseService | null = null;
let userDbService: UserDatabaseService | null = null;
try {
  // ... perform database operations
} catch (error) {
  // handle errors
} finally {
  // Always close connections to free resources
  userDbService?.close();
  dbService?.close();
}
```

## Methods Available

The `better-sqlite3` library provides these key methods:
- `.prepare(sql)` - Prepares a statement for execution
- `.run(...params)` - Executes a statement and returns info about the operation
- `.get(...params)` - Executes a statement and returns a single row
- `.all(...params)` - Executes a statement and returns all rows
- `.transaction(...)` - Creates a transaction function

## Best Practices

1. **Use Services**: Prefer the service layer rather than direct database access
2. **Close Connections**: Always close database connections when done
3. **Use Prepared Statements**: Always use prepared statements to prevent SQL injection
4. **Error Handling**: Implement proper error handling for database operations
5. **Resource Management**: Use try/finally blocks to ensure connections are closed

This approach eliminates the need for manual connection and cursor management, making the code cleaner and easier to maintain.