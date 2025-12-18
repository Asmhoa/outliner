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
    // Create pages table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        workspace_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces (id)
      )
    `);

    // Create workspaces table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create blocks table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS blocks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        position INTEGER NOT NULL,
        type TEXT NOT NULL DEFAULT 'text',
        page_id INTEGER NOT NULL,
        parent_block_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (page_id) REFERENCES pages (id) ON DELETE CASCADE,
        FOREIGN KEY (parent_block_id) REFERENCES blocks (id) ON DELETE SET NULL
      )
    `);

    // Create FTS (Full-Text Search) virtual tables for efficient searching
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS pages_fts USING fts5(
        title,
        content='',
        prefix='2 3 4 5'
      );
    `);

    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS blocks_fts USING fts5(
        content,
        content='',
        prefix='2 3 4 5'
      );
    `);

    // Set up triggers to keep FTS tables synchronized with the main tables
    this.setupFtsTriggers();

    // Enable foreign key constraints
    this.db.exec('PRAGMA foreign_keys = ON');
  }

  /**
   * Set up triggers to keep FTS tables synchronized
   */
  private setupFtsTriggers(): void {
    // Triggers for pages table and pages_fts
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS tr_pages_ai 
      AFTER INSERT ON pages 
      BEGIN
        INSERT INTO pages_fts(rowid, title) VALUES (new.id, new.title);
      END;
    `);

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS tr_pages_ad 
      AFTER DELETE ON pages 
      BEGIN
        DELETE FROM pages_fts WHERE rowid = old.id;
      END;
    `);

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS tr_pages_au 
      AFTER UPDATE OF title ON pages 
      BEGIN
        UPDATE pages_fts SET title = new.title WHERE rowid = new.id;
      END;
    `);

    // Triggers for blocks table and blocks_fts
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS tr_blocks_ai 
      AFTER INSERT ON blocks 
      BEGIN
        INSERT INTO blocks_fts(rowid, content) VALUES (new.id, new.content);
      END;
    `);

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS tr_blocks_ad 
      AFTER DELETE ON blocks 
      BEGIN
        DELETE FROM blocks_fts WHERE rowid = old.id;
      END;
    `);

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS tr_blocks_au 
      AFTER UPDATE OF content ON blocks 
      BEGIN
        UPDATE blocks_fts SET content = new.content WHERE rowid = new.id;
      END;
    `);
  }

  /**
   * Add a new page to the database
   */
  addPage(title: string): number {
    // Check if a page with this title already exists
    const existingPage = this.getAllPages().find(page => page.title === title);
    if (existingPage) {
      throw new PageAlreadyExistsError(`Page with title '${title}' already exists`);
    }

    const stmt = this.db.prepare(`
      INSERT INTO pages (title)
      VALUES (?)
    `);

    const result = stmt.run(title);
    return result.lastInsertRowid as number;
  }

  /**
   * Get a page by its ID
   */
  getPageById(id: number): Page {
    const stmt = this.db.prepare(`
      SELECT id, title, workspace_id as workspaceId,
             created_at as createdAt, updated_at as updatedAt
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
      SELECT id, title, workspace_id as workspaceId,
             created_at as createdAt, updated_at as updatedAt
      FROM pages
      ORDER BY created_at DESC
    `);
    
    return stmt.all() as Page[];
  }

  /**
   * Update a page's title
   */
  updatePageTitle(id: number, newTitle: string): boolean {
    const stmt = this.db.prepare(`
      UPDATE pages
      SET title = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    const result = stmt.run(newTitle, id);
    return result.changes > 0;
  }

  /**
   * Delete a page by its ID
   */
  deletePage(id: number): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM pages
      WHERE id = ?
    `);
    
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Add a new block to the database
   */
  addBlock(content: string, position: number, type: string, pageId?: number, parentBlockId?: number): number {
    const stmt = this.db.prepare(`
      INSERT INTO blocks (content, position, type, page_id, parent_block_id)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(content, position, type, pageId || null, parentBlockId || null);
    return result.lastInsertRowid as number;
  }

  /**
   * Get a block by its ID
   */
  getBlockById(id: number): Block {
    const stmt = this.db.prepare(`
      SELECT id, content, position, type, page_id as pageId,
             parent_block_id as parentBlockId,
             created_at as createdAt, updated_at as updatedAt
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
  getBlocksByPageId(pageId: number): Block[] {
    const stmt = this.db.prepare(`
      SELECT id, content, position, type, page_id as pageId,
             parent_block_id as parentBlockId,
             created_at as createdAt, updated_at as updatedAt
      FROM blocks
      WHERE page_id = ?
      ORDER BY position ASC
    `);
    
    return stmt.all() as Block[];
  }

  /**
   * Update a block's content
   */
  updateBlockContent(id: number, newContent: string): boolean {
    const stmt = this.db.prepare(`
      UPDATE blocks
      SET content = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    const result = stmt.run(newContent, id);
    return result.changes > 0;
  }

  /**
   * Update a block's parent relationship
   */
  updateBlockParent(id: number, newPageId?: number, newParentBlockId?: number): boolean {
    const stmt = this.db.prepare(`
      UPDATE blocks
      SET page_id = ?, parent_block_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    const result = stmt.run(newPageId || null, newParentBlockId || null, id);
    return result.changes > 0;
  }

  /**
   * Update a block's position
   */
  updateBlockPosition(blockId: number, newPosition: number, parentId?: number): boolean {
    const stmt = this.db.prepare(`
      UPDATE blocks
      SET position = ?, parent_block_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    const result = stmt.run(newPosition, parentId || null, blockId);
    return result.changes > 0;
  }

  /**
   * Delete a block by its ID
   */
  deleteBlock(id: number): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM blocks
      WHERE id = ?
    `);
    
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Add a new workspace to the database
   */
  addWorkspace(name: string, color: string): number {
    const stmt = this.db.prepare(`
      INSERT INTO workspaces (name, color)
      VALUES (?, ?)
    `);
    
    const result = stmt.run(name, color);
    return result.lastInsertRowid as number;
  }

  /**
   * Get a workspace by its ID
   */
  getWorkspaceById(id: number): Workspace {
    const stmt = this.db.prepare(`
      SELECT id, name, color,
             created_at as createdAt, updated_at as updatedAt
      FROM workspaces
      WHERE id = ?
    `);

    const result = stmt.get(id) as Workspace | undefined;
    if (!result) {
      throw new WorkspaceNotFoundError(`Workspace with id '${id}' not found`);
    }
    return result;
  }

  /**
   * Get all workspaces from the database
   */
  getAllWorkspaces(): Workspace[] {
    const stmt = this.db.prepare(`
      SELECT id, name, color,
             created_at as createdAt, updated_at as updatedAt
      FROM workspaces
      ORDER BY created_at DESC
    `);
    
    return stmt.all() as Workspace[];
  }

  /**
   * Update a workspace's properties
   */
  updateWorkspace(id: number, name: string, color: string): boolean {
    const stmt = this.db.prepare(`
      UPDATE workspaces
      SET name = ?, color = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    const result = stmt.run(name, color, id);
    return result.changes > 0;
  }

  /**
   * Delete a workspace by its ID
   */
  deleteWorkspace(id: number): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM workspaces
      WHERE id = ?
    `);
    
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Search for pages based on a query string
   */
  searchPages(query: string): Page[] {
    // Use FTS to search for pages by title
    const ftsStmt = this.db.prepare(`
      SELECT rowid FROM pages_fts
      WHERE pages_fts MATCH ?
    `);
    
    const matchingIds = ftsStmt.all(query).map(row => (row as any).rowid);
    
    if (matchingIds.length === 0) {
      return [];
    }
    
    // Get full page records for matching IDs
    const placeholders = matchingIds.map(() => '?').join(',');
    const pageStmt = this.db.prepare(`
      SELECT id, title, workspace_id as workspaceId,
             created_at as createdAt, updated_at as updatedAt
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
      SELECT rowid FROM blocks_fts
      WHERE blocks_fts MATCH ?
    `);
    
    const matchingIds = ftsStmt.all(query).map(row => (row as any).rowid);
    
    if (matchingIds.length === 0) {
      return [];
    }
    
    // Get full block records for matching IDs
    const placeholders = matchingIds.map(() => '?').join(',');
    const blockStmt = this.db.prepare(`
      SELECT id, content, position, type, page_id as pageId,
             parent_block_id as parentBlockId,
             created_at as createdAt, updated_at as updatedAt
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
}