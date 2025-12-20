import BetterSqlite3 from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { promises as fsPromises } from 'fs';
import { ISystemDatabase } from './interfaces';
import { SYSTEM_DB_NAME, TESTING_SYSTEM_DB_NAME } from '../config';
import { isTestEnv } from '../utils';
import { UserDatabaseAlreadyExistsError, UserDatabaseNotFoundError } from './errors';
import { z } from 'zod';

import {
  UserDatabaseInfo,
  UserDatabaseInfoSchema
} from '../models/entities';

/**
 * SystemDatabase manages the list of UserDatabases available to the application.
 * It maintains a table of database names and their corresponding file paths.
 */
export class SystemDatabase implements ISystemDatabase {
  private db: BetterSqlite3.Database;
  private readonly TABLE_NAME = 'user_databases';
  private databasesDir: string;

  constructor(dbPath?: string, databasesDir?: string) {
    // Define the directory for user databases
    this.databasesDir = databasesDir || path.join(__dirname, '..', 'databases');

    // Create the databases directory synchronously if it doesn't exist
    // Better to use synchronous fs call in constructor
    require('fs').mkdirSync(this.databasesDir, { recursive: true });

    // Determine if a custom system database path was provided
    let resolvedDbPath = process.env.OUTLINER_SYS_DB_PATH || dbPath;
    if (!resolvedDbPath) {
      if (isTestEnv()) {
        // Use a different system.db for testing
        resolvedDbPath = path.join(this.databasesDir, TESTING_SYSTEM_DB_NAME);
      } else {
        resolvedDbPath = path.join(this.databasesDir, SYSTEM_DB_NAME);
      }
    }

    this.db = new BetterSqlite3(resolvedDbPath);
    this.db.pragma('foreign_keys = ON');
    this.initializeTables();
  }

  /**
   * Initialize required tables for the system database.
   */
  private initializeTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.TABLE_NAME} (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        name TEXT UNIQUE NOT NULL,
        path TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  /**
   * Get all user databases from the system database
   */
  getAllUserDatabases(): UserDatabaseInfo[] {
    const stmt = this.db.prepare(`
      SELECT id, name, path, created_at
      FROM ${this.TABLE_NAME}
      ORDER BY created_at DESC
    `);

    const results = stmt.all() as any[];
    // Validate and parse the array using the schema
    return z.array(UserDatabaseInfoSchema).parse(results);
  }

  /**
   * Get a specific user database by ID
   */
  getUserDatabaseById(id: string): UserDatabaseInfo {
    const stmt = this.db.prepare(`
      SELECT id, name, path, created_at
      FROM ${this.TABLE_NAME}
      WHERE id = ?
    `);

    const result = stmt.get(id) as any;
    if (!result) {
      throw new UserDatabaseNotFoundError(`Database with id '${id}' not found.`);
    }
    // Validate and parse the result using the schema
    return UserDatabaseInfoSchema.parse(result);
  }

  /**
   * Get a specific user database by name
   */
  getUserDatabaseByName(name: string): UserDatabaseInfo {
    const stmt = this.db.prepare(`
      SELECT id, name, path, created_at
      FROM ${this.TABLE_NAME}
      WHERE name = ?
    `);

    const result = stmt.get(name) as any;
    if (!result) {
      throw new UserDatabaseNotFoundError(`Database with name '${name}' not found.`);
    }
    // Validate and parse the result using the schema
    return UserDatabaseInfoSchema.parse(result);
  }

  /**
   * Get a specific user database by path
   */
  getUserDatabaseByPath(path: string): UserDatabaseInfo {
    const stmt = this.db.prepare(`
      SELECT id, name, path, created_at
      FROM ${this.TABLE_NAME}
      WHERE path = ?
    `);

    const result = stmt.get(path) as any;
    if (!result) {
      throw new UserDatabaseNotFoundError(`Database with path '${path}' not found.`);
    }
    // Validate and parse the result using the schema
    return UserDatabaseInfoSchema.parse(result);
  }

  /**
   * Add a new user database to the system database
   */
  async addUserDatabase(name: string): Promise<UserDatabaseInfo> {
    try {
      // Calculate path from name and sanitize it
      let dbPath = name.toLowerCase().replace(/\s/g, '_') + '.db';
      dbPath = this.sanitizePath(dbPath); // Sanitize to prevent directory traversal
      const fullDbPath = path.join(this.databasesDir, dbPath);

      const stmt = this.db.prepare(`
        INSERT INTO ${this.TABLE_NAME} (name, path)
        VALUES (?, ?)
      `);

      // Insert will generate the ID automatically due to DEFAULT (lower(hex(randomblob(16))))
      stmt.run(name, dbPath);

      // Get the inserted record to return all fields
      const selectStmt = this.db.prepare(`
        SELECT id, name, path, created_at
        FROM ${this.TABLE_NAME}
        WHERE name = ?
      `);
      const result = selectStmt.get(name) as any;

      // Validate and parse the result using the schema
      const validatedData = UserDatabaseInfoSchema.parse({
        id: result.id,
        name,
        path: dbPath,
        created_at: result.created_at
      });
      return validatedData;
    } catch (error) {
      if (error instanceof BetterSqlite3.SqliteError && error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new UserDatabaseAlreadyExistsError(`Database '${name}' already exists.`);
      }
      throw error;
    }
  }

  /**
   * Sanitize path to prevent directory traversal attacks
   * Replace /, \, and .. with _
   */
  private sanitizePath(inputPath: string): string {
    return inputPath
      .toLowerCase()
      .replace(/\//g, '_')
      .replace(/\\/g, '_')
      .replace(/\.\./g, '_');
  }

  /**
   * Update an existing user database
   */
  async updateUserDatabase(id: string, newName?: string): Promise<boolean> {
    if (!newName) {
      return true; // Nothing to update
    }

    // Get current database info
    const currentDb = this.getUserDatabaseById(id);
    if (!currentDb) {
      throw new UserDatabaseNotFoundError(`Database with id '${id}' not found.`);
    }

    const oldDbEntryPathRelative = currentDb.path;
    const oldFileSystemPath = path.join(this.databasesDir, oldDbEntryPathRelative);

    // Calculate the new relative path from the new name
    const calculatedPathFromName = newName.toLowerCase().replace(/\s/g, '_') + '.db';
    const newDbEntryPathRelative = this.sanitizePath(calculatedPathFromName);

    // Check if name already exists (but exclude the current database being updated)
    // Use a different approach - try to get by name, but if it doesn't exist that's ok
    let existingByName: UserDatabaseInfo | null = null;
    try {
      existingByName = this.getUserDatabaseByName(newName);
    } catch (error) {
      if (error instanceof UserDatabaseNotFoundError) {
        existingByName = null; // Name doesn't exist, which is fine
      } else {
        throw error; // Some other error occurred
      }
    }

    // If there's an existing database with this name and it's not the one we're updating
    if (existingByName && existingByName.id !== id) {
      throw new UserDatabaseAlreadyExistsError(
        `Cannot update database with id '${id}' to '${newName}': name already exists`
      );
    }

    // Update both name and path in the database
    try {
      const stmt = this.db.prepare(
        `UPDATE ${this.TABLE_NAME} SET name = ?, path = ? WHERE id = ?`
      );
      const result = stmt.run(newName, newDbEntryPathRelative, id);

      if (result.changes === 0) {
        throw new UserDatabaseNotFoundError(
          `User database with id '${id}' not found.`
        );
      }

      // Rename the actual file to match the new name
      const newFileSystemPath = path.join(this.databasesDir, newDbEntryPathRelative);

      try {
        await fsPromises.access(oldFileSystemPath);
        await fsPromises.rename(oldFileSystemPath, newFileSystemPath);
      } catch (error) {
        // If old file doesn't exist, it might be a new path for a moved/external file
        // Or it's an error. For now, just continue.
      }

      return true;
    } catch (error) {
      if (error instanceof BetterSqlite3.SqliteError && error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new UserDatabaseAlreadyExistsError(
          `Database '${newName}' already exists.`
        );
      }
      throw error;
    }
  }

  /**
   * Delete a user database from the system database
   */
  async deleteUserDatabase(id: string): Promise<boolean> {
    // First get the database info to know the file path
    const dbToDelete = this.getUserDatabaseById(id);
    if (!dbToDelete) {
      throw new UserDatabaseNotFoundError(`User database with id '${id}' not found.`);
    }

    // Delete the actual database file first
    const dbFilePath = path.join(this.databasesDir, dbToDelete.path);
    try {
      await fsPromises.unlink(dbFilePath); // unlink removes the file
    } catch (error) {
      // If file doesn't exist, just log a warning and continue
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.warn(`Database file '${dbFilePath}' not found during deletion.`);
      } else {
        // If there's another error (permissions, etc.), throw an error to prevent removal from system DB
        throw error;
      }
    }

    const stmt = this.db.prepare(`
      DELETE FROM ${this.TABLE_NAME}
      WHERE id = ?
    `);

    const result = stmt.run(id);

    if (result.changes === 0) {
      throw new UserDatabaseNotFoundError(`User database with id '${id}' not found.`);
    }

    return result.changes > 0;
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
  }
}
