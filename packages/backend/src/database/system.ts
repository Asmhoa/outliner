import { Database as SQLiteDB } from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import {
  ISystemDatabase,
  UserDatabaseInfo,
  IDatabaseConnection
} from './interfaces';

/**
 * SystemDatabase manages the list of UserDatabases available to the application.
 * It maintains a table of database names and their corresponding file paths.
 */
export class SystemDatabase implements ISystemDatabase {
  private db: SQLiteDB;
  private readonly TABLE_NAME = 'user_databases';

  constructor(private dbPath: string) {
    this.db = new SQLiteDB(dbPath);
    this.db.exec('PRAGMA foreign_keys = ON');
    this.initializeTables();
  }

  /**
   * Initialize required tables for the system database.
   */
  private initializeTables(): void {
    // Create the user_databases table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.TABLE_NAME} (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        path TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  /**
   * Get all user databases from the system database
   */
  getAllUserDatabases(): UserDatabaseInfo[] {
    const stmt = this.db.prepare(`
      SELECT id, name, path, created_at as createdAt
      FROM ${this.TABLE_NAME}
      ORDER BY created_at DESC
    `);

    return stmt.all() as UserDatabaseInfo[];
  }

  /**
   * Get a specific user database by ID
   */
  getUserDatabaseById(id: string): UserDatabaseInfo | null {
    const stmt = this.db.prepare(`
      SELECT id, name, path, created_at as createdAt
      FROM ${this.TABLE_NAME}
      WHERE id = ?
    `);

    const result = stmt.get(id) as UserDatabaseInfo | undefined;
    return result || null;
  }

  /**
   * Add a new user database to the system database
   */
  addUserDatabase(name: string, path: string): UserDatabaseInfo {
    const id = uuidv4();
    const stmt = this.db.prepare(`
      INSERT INTO ${this.TABLE_NAME} (id, name, path)
      VALUES (?, ?, ?)
    `);

    stmt.run(id, name, path);

    return {
      id,
      name,
      path,
      createdAt: new Date()
    };
  }

  /**
   * Update an existing user database
   */
  updateUserDatabase(id: string, name: string): boolean {
    const stmt = this.db.prepare(`
      UPDATE ${this.TABLE_NAME}
      SET name = ?
      WHERE id = ?
    `);

    const result = stmt.run(name, id);
    return result.changes > 0;
  }

  /**
   * Remove a user database from the system database
   */
  removeUserDatabase(id: string): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM ${this.TABLE_NAME}
      WHERE id = ?
    `);

    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
  }
}
