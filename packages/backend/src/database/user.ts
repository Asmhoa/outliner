import BetterSqlite3 from 'better-sqlite3';
import {
  IUserDatabase,
  IDatabaseConnection
} from './interfaces';

import {
  Page,
  Block,
  Workspace
} from '../models/data-objects';

import {
  PageNotFoundError,
  BlockNotFoundError,
  WorkspaceNotFoundError,
  PageAlreadyExistsError
} from './errors';

/**
 * UserDatabase handles operations for a specific user's data.
 * It stores pages, blocks, and workspaces for a single user.
 */
export class UserDatabase implements IUserDatabase {
  private db: BetterSqlite3.Database;

  constructor(private dbPath: string) {
    this.db = new BetterSqlite3(dbPath);
    this.initializeTables();
  }

  /**
   * Initialize required tables for the user database.
   */
  private initializeTables(): void {
    // Create workspaces table (matching Python implementation)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id INTEGER PRIMARY KEY,
        name TEXT,
        color BLOB NOT NULL
      )
    `);

    // Create pages table (matching Python implementation)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pages (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        title TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create FTS5 virtual table for full-text search of pages
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS pages_fts USING fts5(
        title,
        page_id UNINDEXED,
        content='pages'
      )
    `);

    // Create blocks table (matching Python implementation)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS blocks (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        content TEXT NOT NULL,
        page_id TEXT NULL,
        parent_block_id TEXT NULL,
        position INTEGER NOT NULL,
        type TEXT NOT NULL DEFAULT 'text',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_block_id) REFERENCES blocks(id) ON DELETE CASCADE,
        CHECK (
          (page_id IS NOT NULL AND parent_block_id IS NULL)
          OR
          (page_id IS NULL AND parent_block_id IS NOT NULL)
        )
      )
    `);

    // Create FTS5 virtual table for full-text search of blocks
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS blocks_fts USING fts5(
        content,
        block_id UNINDEXED,
        page_id UNINDEXED,
        parent_block_id UNINDEXED,
        type UNINDEXED,
        content='blocks'
      )
    `);

    // Set up triggers to keep FTS tables synchronized with the main tables
    this.setupFtsTriggers();

    // Enable foreign key constraints
    this.db.exec('PRAGMA foreign_keys = ON');

    // Create default workspace if it doesn't exist
    this.createDefaultWorkspace();
  }

  /**
   * Set up triggers to keep FTS tables synchronized
   */
  private setupFtsTriggers(): void {
    // Triggers for pages table and pages_fts (matching Python implementation)
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS pages_ai AFTER INSERT ON pages
      BEGIN
        INSERT INTO pages_fts (rowid, title, page_id) VALUES (NEW.rowid, NEW.title, NEW.id);
      END;
    `);

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS pages_ad AFTER DELETE ON pages
      BEGIN
        INSERT INTO pages_fts(pages_fts, rowid, title) VALUES('delete', OLD.rowid, OLD.title);
      END;
    `);

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS pages_au AFTER UPDATE ON pages
      BEGIN
        INSERT INTO pages_fts(pages_fts, rowid, title) VALUES('delete', OLD.rowid, OLD.title);
        INSERT INTO pages_fts(rowid, title, page_id) VALUES (NEW.rowid, NEW.title, NEW.id);
      END;
    `);

    // Triggers for blocks table and blocks_fts (matching Python implementation)
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS blocks_ai AFTER INSERT ON blocks
      BEGIN
        INSERT INTO blocks_fts (rowid, content, block_id, page_id, parent_block_id, type)
        VALUES (NEW.rowid, NEW.content, NEW.id, NEW.page_id, NEW.parent_block_id, NEW.type);
      END;
    `);

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS blocks_ad AFTER DELETE ON blocks
      BEGIN
        INSERT INTO blocks_fts(blocks_fts, rowid, content) VALUES('delete', OLD.rowid, OLD.content);
      END;
    `);

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS blocks_au AFTER UPDATE ON blocks
      BEGIN
        INSERT INTO blocks_fts(blocks_fts, rowid, content) VALUES('delete', OLD.rowid, OLD.content);
        INSERT INTO blocks_fts (rowid, content, block_id, page_id, parent_block_id, type)
        VALUES (NEW.rowid, NEW.content, NEW.id, NEW.page_id, NEW.parent_block_id, NEW.type);
      END;
    `);
  }

  /**
   * Add a new page to the database
   */
  addPage(title: string): string {
    // First check if a page with this title already exists (due to UNIQUE constraint)
    const checkStmt = this.db.prepare('SELECT id FROM pages WHERE title = ?');
    const existing = checkStmt.get(title);
    if (existing) {
      throw new PageAlreadyExistsError(`Page with title '${title}' already exists`);
    }

    const insertStmt = this.db.prepare(`
      INSERT INTO pages (title) VALUES (?)
    `);
    insertStmt.run(title);

    // Get the ID of the newly inserted page
    const getIdStmt = this.db.prepare('SELECT id FROM pages WHERE title = ? ORDER BY created_at DESC LIMIT 1');
    const result = getIdStmt.get(title) as { id: string };
    return result.id;
  }

  /**
   * Get a page by its ID
   */
  getPageById(id: string): Page {
    const stmt = this.db.prepare(`
      SELECT id, title, created_at as createdAt
      FROM pages
      WHERE id = ?
    `);

    const result = stmt.get(id) as Page | undefined;
    if (!result) {
      throw new PageNotFoundError(`Page with id '${id}' not found`);
    }
    return result;
  }

  /**
   * Get all pages from the database
   */
  getAllPages(): Page[] {
    const stmt = this.db.prepare(`
      SELECT id, title, created_at as createdAt
      FROM pages
      ORDER BY created_at DESC
    `);

    return stmt.all() as Page[];
  }

  /**
   * Update a page's title
   */
  updatePageTitle(id: string, newTitle: string): void {
    // Check if a different page with this title already exists
    const checkStmt = this.db.prepare(`
      SELECT id FROM pages WHERE title = ? AND id != ?
    `);
    const existing = checkStmt.get(newTitle, id);
    if (existing) {
      throw new PageAlreadyExistsError(`Page with title '${newTitle}' already exists`);
    }

    const stmt = this.db.prepare(`
      UPDATE pages
      SET title = ?
      WHERE id = ?
    `);

    const result = stmt.run(newTitle, id);
    if (result.changes === 0) {
      throw new PageNotFoundError(`Page with id '${id}' not found`);
    }
  }

  /**
   * Delete a page by its ID
   */
  deletePage(id: string): void {
    const stmt = this.db.prepare(`
      DELETE FROM pages
      WHERE id = ?
    `);

    const result = stmt.run(id);
    if (result.changes === 0) {
      throw new PageNotFoundError(`Page with id '${id}' not found`);
    }
  }

  /**
   * Add a new block to the database
   */
  addBlock(content: string, position: number, type: string = 'text', pageId?: string, parentBlockId?: string): string {
    if (pageId !== undefined && parentBlockId !== undefined) {
      throw new Error("A block must be associated with either a page_id or a parent_block_id, but not both.");
    }

    if (pageId !== undefined) {
      const stmt = this.db.prepare(`
        INSERT INTO blocks (content, position, type, page_id)
        VALUES (?, ?, ?, ?)
      `);
      stmt.run(content, position, type, pageId);
    } else if (parentBlockId !== undefined) {
      const stmt = this.db.prepare(`
        INSERT INTO blocks (content, position, type, parent_block_id)
        VALUES (?, ?, ?, ?)
      `);
      stmt.run(content, position, type, parentBlockId);
    } else {
      // Block without parent - both pageId and parentBlockId are undefined
      const stmt = this.db.prepare(`
        INSERT INTO blocks (content, position, type)
        VALUES (?, ?, ?)
      `);
      stmt.run(content, position, type);
    }

    // Get the ID of the newly inserted block
    const getIdStmt = this.db.prepare('SELECT id FROM blocks ORDER BY created_at DESC LIMIT 1');
    const getIdResult = getIdStmt.get() as { id: string };
    return getIdResult.id;
  }

  /**
   * Get a block by its ID
   */
  getBlockById(id: string): Block {
    const stmt = this.db.prepare(`
      SELECT id, content, page_id as pageId, parent_block_id as parentBlockId,
             position, type, created_at as createdAt
      FROM blocks
      WHERE id = ?
    `);

    const result = stmt.get(id) as Block | undefined;
    if (!result) {
      throw new BlockNotFoundError(`Block with id '${id}' not found`);
    }
    return result;
  }

  /**
   * Get all blocks associated with a specific page
   */
  getBlocksByPageId(pageId: string): Block[] {
    const stmt = this.db.prepare(`
      SELECT id, content, page_id as pageId, parent_block_id as parentBlockId,
             position, type, created_at as createdAt
      FROM blocks
      WHERE page_id = ?
      ORDER BY position ASC
    `);

    return stmt.all() as Block[];
  }

  /**
   * Update a block's content
   */
  updateBlockContent(id: string, newContent: string): void {
    const stmt = this.db.prepare(`
      UPDATE blocks
      SET content = ?
      WHERE id = ?
    `);

    const result = stmt.run(newContent, id);
    if (result.changes === 0) {
      throw new BlockNotFoundError(`Block with id '${id}' not found`);
    }
  }

  /**
   * Update a block's parent relationship
   */
  updateBlockParent(id: string, newPageId?: string, newParentBlockId?: string): void {
    if (newPageId !== undefined && newParentBlockId !== undefined) {
      throw new Error("A block must be associated with either a page_id or a parent_block_id, but not both.");
    }

    let result;
    if (newPageId !== undefined) {
      const stmt = this.db.prepare(`
        UPDATE blocks SET page_id = ?, parent_block_id = NULL WHERE id = ?
      `);
      result = stmt.run(newPageId, id);
    } else if (newParentBlockId !== undefined) {
      const stmt = this.db.prepare(`
        UPDATE blocks SET parent_block_id = ?, page_id = NULL WHERE id = ?
      `);
      result = stmt.run(newParentBlockId, id);
    } else {
      // Remove parent association - set both to NULL
      const stmt = this.db.prepare(`
        UPDATE blocks SET page_id = NULL, parent_block_id = NULL WHERE id = ?
      `);
      result = stmt.run(id);
    }

    if (result.changes === 0) {
      throw new BlockNotFoundError(`Block with id '${id}' not found`);
    }
  }

  /**
   * Update a block's position
   */
  updateBlockPosition(blockId: string, newPosition: number): void {
    const stmt = this.db.prepare(`
      UPDATE blocks
      SET position = ?
      WHERE id = ?
    `);

    const result = stmt.run(newPosition, blockId);
    if (result.changes === 0) {
      throw new BlockNotFoundError(`Block with id '${blockId}' not found`);
    }
  }

  /**
   * Delete a block by its ID
   */
  deleteBlock(id: string): void {
    const stmt = this.db.prepare(`
      DELETE FROM blocks
      WHERE id = ?
    `);

    const result = stmt.run(id);
    if (result.changes === 0) {
      throw new BlockNotFoundError(`Block with id '${id}' not found`);
    }
  }

  /**
   * Add a new workspace to the database
   */
  addWorkspace(name: string, color: string): number {
    // Convert color string to BLOB format (bytes)
    const colorBytes = Buffer.from(color.replace('#', ''), 'hex');

    // Find the next available ID, skipping ID 0 which is reserved for the default workspace
    const maxIdStmt = this.db.prepare(`
      SELECT COALESCE(MAX(id), -1) AS maxId FROM workspaces WHERE id != 0
    `);
    const maxIdResult = maxIdStmt.get() as { maxId: number };
    const nextId = maxIdResult.maxId + 1;

    const stmt = this.db.prepare(`
      INSERT INTO workspaces (id, name, color)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(nextId, name, colorBytes);
    return result.lastInsertRowid as number;
  }

  /**
   * Get a workspace by its ID
   */
  getWorkspaceById(id: number): Workspace {
    const stmt = this.db.prepare(`
      SELECT id, name, color
      FROM workspaces
      WHERE id = ?
    `);

    const row = stmt.get(id) as { id: number, name: string, color: Buffer } | undefined;
    if (!row) {
      throw new WorkspaceNotFoundError(`Workspace with id '${id}' not found`);
    }

    // Convert BLOB color back to hex string
    const color = `#${row.color.toString('hex')}`;

    return {
      id: row.id,
      name: row.name,
      color: color,
      createdAt: undefined,  // We don't have timestamps in the Python schema
      updatedAt: undefined   // We don't have timestamps in the Python schema
    };
  }

  /**
   * Get all workspaces from the database
   */
  getAllWorkspaces(): Workspace[] {
    const stmt = this.db.prepare(`
      SELECT id, name, color
      FROM workspaces
    `);

    const rows = stmt.all() as { id: number, name: string, color: Buffer }[];

    return rows.map(row => {
      // Convert BLOB color back to hex string
      const color = `#${row.color.toString('hex')}`;

      return {
        id: row.id,
        name: row.name,
        color: color,
        createdAt: undefined,  // We don't have timestamps in the Python schema
        updatedAt: undefined   // We don't have timestamps in the Python schema
      };
    });
  }

  /**
   * Update a workspace's properties
   */
  updateWorkspace(id: number, name: string, color: string): void {
    // Convert color string to BLOB format (bytes)
    const colorBytes = Buffer.from(color.replace('#', ''), 'hex');

    const stmt = this.db.prepare(`
      UPDATE workspaces
      SET name = ?, color = ?
      WHERE id = ?
    `);

    const result = stmt.run(name, colorBytes, id);
    if (result.changes === 0) {
      throw new WorkspaceNotFoundError(`Workspace with id '${id}' not found`);
    }
  }

  /**
   * Delete a workspace by its ID
   */
  deleteWorkspace(id: number): void {
    const stmt = this.db.prepare(`
      DELETE FROM workspaces
      WHERE id = ?
    `);

    const result = stmt.run(id);
    if (result.changes === 0) {
      throw new WorkspaceNotFoundError(`Workspace with id '${id}' not found`);
    }
  }

  /**
   * Search for pages based on a query string
   */
  searchPages(query: string): Page[] {
    // Use FTS to search for pages by title
    const ftsStmt = this.db.prepare(`
      SELECT page_id FROM pages_fts
      WHERE pages_fts MATCH ?
    `);

    const matchingIds = ftsStmt.all(query).map(row => (row as any).page_id);

    if (matchingIds.length === 0) {
      return [];
    }

    // Get full page records for matching IDs
    const placeholders = matchingIds.map(() => '?').join(',');
    const pageStmt = this.db.prepare(`
      SELECT id, title, created_at as createdAt
      FROM pages
      WHERE id IN (${placeholders})
      ORDER BY created_at DESC
    `);

    return pageStmt.all(...matchingIds) as Page[];
  }

  /**
   * Search for blocks based on a query string
   */
  searchBlocks(query: string): Block[] {
    // Use FTS to search for blocks by content
    const ftsStmt = this.db.prepare(`
      SELECT block_id FROM blocks_fts
      WHERE blocks_fts MATCH ?
    `);

    const matchingIds = ftsStmt.all(query).map(row => (row as any).block_id);

    if (matchingIds.length === 0) {
      return [];
    }

    // Get full block records for matching IDs
    const placeholders = matchingIds.map(() => '?').join(',');
    const blockStmt = this.db.prepare(`
      SELECT id, content, page_id as pageId, parent_block_id as parentBlockId,
             position, type, created_at as createdAt
      FROM blocks
      WHERE id IN (${placeholders})
      ORDER BY position ASC
    `);

    return blockStmt.all(...matchingIds) as Block[];
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
  }

  /**
   * Creates a default workspace if it doesn't exist.
   */
  private createDefaultWorkspace(): void {
    // Check if default workspace with ID 0 already exists
    const stmt = this.db.prepare('SELECT 1 FROM workspaces WHERE id = 0');
    const existing = stmt.get();

    if (!existing) {
      const defaultName = 'Default';
      const defaultColor = Buffer.from('4285F4', 'hex'); // Color as BLOB
      const insertStmt = this.db.prepare(
        'INSERT INTO workspaces (id, name, color) VALUES (?, ?, ?)'
      );
      insertStmt.run(0, defaultName, defaultColor);
    }
  }
}