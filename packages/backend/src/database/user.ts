import BetterSqlite3 from 'better-sqlite3';
import {
  IUserDatabase,
  IDatabaseConnection
} from './interfaces';
import { z } from 'zod';

import {
  Page,
  Block,
  Workspace,
  PageSchema,
  BlockSchema,
  WorkspaceSchema
} from './entities';

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
    this.db.pragma('foreign_keys = ON');
    this.initializeTables();
  }

  /**
   * Initialize required tables for the user database.
   */
  private initializeTables(): void {
    // Create workspaces table (matching Python implementation)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS workspaces (
        workspace_id INTEGER PRIMARY KEY,
        name VARCHAR(255),
        color BLOB(3) NOT NULL
      )
    `);

    // Create pages table (matching Python implementation)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pages (
        page_id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        title VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        block_id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        content TEXT NOT NULL,
        page_id TEXT NULL,
        parent_block_id TEXT NULL,
        position INTEGER NOT NULL,
        type TEXT NOT NULL DEFAULT 'text',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (page_id) REFERENCES pages(page_id) ON DELETE CASCADE,
        FOREIGN KEY (parent_block_id) REFERENCES blocks(block_id) ON DELETE CASCADE,
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
        INSERT INTO pages_fts (rowid, title, page_id) VALUES (NEW.rowid, NEW.title, NEW.page_id);
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
        INSERT INTO pages_fts(rowid, title, page_id) VALUES (NEW.rowid, NEW.title, NEW.page_id);
      END;
    `);

    // Triggers for blocks table and blocks_fts (matching Python implementation)
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS blocks_ai AFTER INSERT ON blocks
      BEGIN
        INSERT INTO blocks_fts (rowid, content, block_id, page_id, parent_block_id, type)
        VALUES (NEW.rowid, NEW.content, NEW.block_id, NEW.page_id, NEW.parent_block_id, NEW.type);
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
        VALUES (NEW.rowid, NEW.content, NEW.block_id, NEW.page_id, NEW.parent_block_id, NEW.type);
      END;
    `);
  }

  /**
   * Add a new page to the database
   */
  addPage(title: string): string {
    // First check if a page with this title already exists (due to UNIQUE constraint)
    const checkStmt = this.db.prepare('SELECT page_id FROM pages WHERE title = ?');
    const existing = checkStmt.get(title);
    if (existing) {
      throw new PageAlreadyExistsError(`Page with title '${title}' already exists`);
    }

    const insertStmt = this.db.prepare(`
      INSERT INTO pages (title) VALUES (?) RETURNING page_id
    `);
    const result = insertStmt.get(title) as { page_id: string };
    return result.page_id;
  }

  /**
   * Get a page by its ID
   */
  getPageById(pageId: string): Page {
    const stmt = this.db.prepare(`
      SELECT page_id, title, created_at
      FROM pages
      WHERE page_id = ?
    `);

    const result = stmt.get(pageId);
    if (!result) {
      throw new PageNotFoundError(`Page with ID ${pageId} not found`);
    }

    return PageSchema.parse(result);
  }

  /**
   * Get all pages from the database
   */
  getAllPages(): Page[] {
    const stmt = this.db.prepare(`
      SELECT page_id, title, created_at
      FROM pages
      ORDER BY created_at DESC
    `);

    const results = stmt.all();
    return z.array(PageSchema).parse(results);
  }

  /**
   * Update a page's title
   */
  updatePageTitle(pageId: string, newTitle: string): void {
    // Check if a different page with this title already exists
    const checkStmt = this.db.prepare(`
      SELECT page_id FROM pages WHERE title = ? AND page_id != ?
    `);
    const existing = checkStmt.get(newTitle, pageId);
    if (existing) {
      throw new PageAlreadyExistsError(`Page with title '${newTitle}' already exists`);
    }

    // Get the old title to verify the page exists
    const checkPageExists = this.db.prepare(`SELECT title FROM pages WHERE page_id = ?`);
    const oldPage = checkPageExists.get(pageId);
    if (oldPage === undefined) {
      throw new PageNotFoundError(`Page with ID ${pageId} not found`);
    }

    const stmt = this.db.prepare(`
      UPDATE pages
      SET title = ?
      WHERE page_id = ?
    `);

    const result = stmt.run(newTitle, pageId);
    if (result.changes === 0) {
      throw new PageNotFoundError(`Page with ID ${pageId} not found`);
    }
  }

  /**
   * Delete a page by its ID
   */
  deletePage(pageId: string): void {
    const stmt = this.db.prepare(`
      DELETE FROM pages
      WHERE page_id = ?
    `);

    const result = stmt.run(pageId);
    if (result.changes === 0) {
      throw new PageNotFoundError(`Page with ID ${pageId} not found`);
    }
  }

    /**

     * Add a new block to the database

     */

    addBlock(content: string, position: number, type: string = 'text', pageId?: string, parentBlockId?: string): string {

      if (pageId !== undefined && parentBlockId !== undefined) {

        throw new Error("A block must be associated with either a page_id or a parent_block_id, but not both.");

      }



      let result: { block_id: string } | undefined;



      if (pageId !== undefined) {

        const stmt = this.db.prepare(`

          INSERT INTO blocks (content, position, type, page_id) VALUES (?, ?, ?, ?) RETURNING block_id

        `);

        result = stmt.get(content, position, type, pageId) as { block_id: string };

      } else if (parentBlockId !== undefined) {

        const stmt = this.db.prepare(`

          INSERT INTO blocks (content, position, type, parent_block_id) VALUES (?, ?, ?, ?) RETURNING block_id

        `);

        result = stmt.get(content, position, type, parentBlockId) as { block_id: string };

      } else {

        // Block without parent - both pageId and parentBlockId are undefined

        const stmt = this.db.prepare(`

          INSERT INTO blocks (content, position, type) VALUES (?, ?, ?) RETURNING block_id

        `);

        result = stmt.get(content, position, type) as { block_id: string };

      }



      return result.block_id;

    }



    /**

     * Get a block by its ID

     */

    getBlockById(blockId: string): Block {

      const stmt = this.db.prepare(`

        SELECT block_id, content, page_id, parent_block_id, position, type, created_at

        FROM blocks

        WHERE block_id = ?

      `);



      const result = stmt.get(blockId);

      if (!result) {

        throw new BlockNotFoundError(`Block with ID ${blockId} not found`);

      }



      return BlockSchema.parse(result);

    }

  /**
   * Get all blocks associated with a specific page
   */
  getBlocksByPageId(pageId: string): Block[] {
    const stmt = this.db.prepare(`
      SELECT block_id, content, page_id, parent_block_id, position, type, created_at
      FROM blocks
      WHERE page_id = ?
      ORDER BY position ASC
    `);

    const results = stmt.all(pageId);
    return z.array(BlockSchema).parse(results);
  }

  /**
   * Update a block's content
   */
  updateBlockContent(blockId: string, newContent: string): void {
    // Get the current block to verify it exists
    const checkBlockExists = this.db.prepare(`SELECT block_id FROM blocks WHERE block_id = ?`);
    const currentBlock = checkBlockExists.get(blockId);
    if (currentBlock === undefined) {
      throw new BlockNotFoundError(`Block with ID ${blockId} not found`);
    }

    const stmt = this.db.prepare(`
      UPDATE blocks
      SET content = ?
      WHERE block_id = ?
    `);

    const result = stmt.run(newContent, blockId);
    if (result.changes === 0) {
      throw new BlockNotFoundError(`Block with ID ${blockId} not found`);
    }
  }

  /**
   * Update a block's parent relationship
   */
  updateBlockParent(blockId: string, newPageId?: string, newParentBlockId?: string): void {
    if (Boolean(newPageId) === Boolean(newParentBlockId)) {
      throw new Error("A block must be associated with either a page_id or a parent_block_id, but not both.");
    }

    // Get the current block to verify it exists
    const checkBlockExists = this.db.prepare(`SELECT block_id FROM blocks WHERE block_id = ?`);
    const currentBlock = checkBlockExists.get(blockId);
    if (currentBlock === undefined) {
      throw new BlockNotFoundError(`Block with ID ${blockId} not found`);
    }

    if (newPageId !== undefined && newParentBlockId === undefined) {
      const stmt = this.db.prepare(`
        UPDATE blocks SET page_id = ?, parent_block_id = NULL WHERE block_id = ?
      `);
      const result = stmt.run(newPageId, blockId);
      if (result.changes === 0) {
        throw new BlockNotFoundError(`Block with ID ${blockId} not found`);
      }
    } else if (newParentBlockId !== undefined && newPageId === undefined) {
      const stmt = this.db.prepare(`
        UPDATE blocks SET parent_block_id = ?, page_id = NULL WHERE block_id = ?
      `);
      const result = stmt.run(newParentBlockId, blockId);
      if (result.changes === 0) {
        throw new BlockNotFoundError(`Block with ID ${blockId} not found`);
      }
    } else {
      // Remove parent association - set both to NULL
      const stmt = this.db.prepare(`
        UPDATE blocks SET page_id = NULL, parent_block_id = NULL WHERE block_id = ?
      `);
      const result = stmt.run(blockId);
      if (result.changes === 0) {
        throw new BlockNotFoundError(`Block with ID ${blockId} not found`);
      }
    }
  }

  /**
   * Update a block's position
   */
  updateBlockPosition(blockId: string, newPosition: number): void {
    // Get the current block to verify it exists
    const checkBlockExists = this.db.prepare(`SELECT block_id FROM blocks WHERE block_id = ?`);
    const currentBlock = checkBlockExists.get(blockId);
    if (currentBlock === undefined) {
      throw new BlockNotFoundError(`Block with ID ${blockId} not found`);
    }

    const stmt = this.db.prepare(`
      UPDATE blocks
      SET position = ?
      WHERE block_id = ?
    `);

    const result = stmt.run(newPosition, blockId);
    if (result.changes === 0) {
      throw new BlockNotFoundError(`Block with ID ${blockId} not found`);
    }
  }

  /**
   * Delete a block by its ID
   */
  deleteBlock(blockId: string): void {
    const stmt = this.db.prepare(`
      DELETE FROM blocks
      WHERE block_id = ?
    `);

    const result = stmt.run(blockId);
    if (result.changes === 0) {
      throw new BlockNotFoundError(`Block with ID ${blockId} not found`);
    }
  }

  /**
   * Add a new workspace to the database
   */
  addWorkspace(name: string, color: string): number {
    // Convert color string to BLOB format (bytes)
    const colorBytes = Buffer.from(color.replace('#', ''), 'hex');

    const stmt = this.db.prepare(`
      INSERT INTO workspaces (name, color) VALUES (?, ?) RETURNING workspace_id
    `);
    const result = stmt.get(name, colorBytes) as { workspace_id: number };
    return result.workspace_id;
  }

  /**
   * Get a workspace by its ID
   */
  getWorkspaceById(workspaceId: number): Workspace {
    const stmt = this.db.prepare(`
      SELECT workspace_id, name, color
      FROM workspaces
      WHERE workspace_id = ?
    `);

    const row = stmt.get(workspaceId) as { workspace_id: number, name: string, color: Buffer } | undefined;
    if (!row) {
      throw new WorkspaceNotFoundError(`Workspace with ID ${workspaceId} not found`);
    }

    // Convert BLOB color back to hex string
    const colorString = `#${row.color.toString('hex')}`;

    // Validate and return typed object
    return WorkspaceSchema.parse({ ...row, color: colorString });
  }

  /**
   * Get all workspaces from the database
   */
  getAllWorkspaces(): Workspace[] {
    const stmt = this.db.prepare(`
      SELECT workspace_id, name, color
      FROM workspaces
    `);

    const rows = stmt.all() as { workspace_id: number, name: string, color: Buffer }[];

    return rows.map(row => {
      // Convert BLOB color back to hex string
      const colorString = `#${row.color.toString('hex')}`;

      // Validate and return typed object
      return WorkspaceSchema.parse({ ...row, color: colorString });
    });
  }

  /**
   * Update a workspace's properties
   */
  updateWorkspace(workspaceId: number, name: string, color: string): void {
    // Convert color string to BLOB format (bytes)
    const colorBytes = Buffer.from(color.replace('#', ''), 'hex');

    const stmt = this.db.prepare(`
      UPDATE workspaces SET name = ?, color = ? WHERE workspace_id = ?
    `);

    const result = stmt.run(name, colorBytes, workspaceId);
    if (result.changes === 0) {
      throw new WorkspaceNotFoundError(`Workspace with ID ${workspaceId} not found`);
    }
  }

  /**
   * Delete a workspace by its ID
   */
  deleteWorkspace(workspaceId: number): void {
    const stmt = this.db.prepare(`
      DELETE FROM workspaces
      WHERE workspace_id = ?
    `);

    const result = stmt.run(workspaceId);
    if (result.changes === 0) {
      throw new WorkspaceNotFoundError(`Workspace with ID ${workspaceId} not found`);
    }
  }

  /**
   * Search for pages based on a query string
   */
  searchPages(query: string, limit: number = 10, escapeSpecialChars: boolean = true): Page[] {
    // Handle empty query gracefully by returning an empty list
    if (!query || query.trim() === "") {
      return [];
    }

    // Sanitize the query to prevent FTS syntax errors if requested
    if (escapeSpecialChars) {
      query = this._ftsEscapeTokens(query);
    }

    // Use FTS to search for pages by title with ranking
    const ftsStmt = this.db.prepare(`
      SELECT p.page_id, p.title, p.created_at
      FROM pages p
      JOIN pages_fts pf ON p.page_id = pf.page_id
      WHERE pages_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `);

    const results = ftsStmt.all(query, limit);
    return z.array(PageSchema).parse(results);
  }

  /**
   * Search for blocks based on a query string
   */
  searchBlocks(query: string, limit: number = 10, escapeSpecialChars: boolean = true): Block[] {
    // Handle empty query gracefully by returning an empty list
    if (!query || query.trim() === "") {
      return [];
    }

    // Sanitize the query to prevent FTS syntax errors if requested
    if (escapeSpecialChars) {
      query = this._ftsEscapeTokens(query);
    }

    // Use FTS to search for blocks by content with ranking
    const ftsStmt = this.db.prepare(`
      SELECT b.block_id, b.content, b.page_id, b.parent_block_id, b.position, b.type, b.created_at
      FROM blocks b
      JOIN blocks_fts bf ON b.block_id = bf.block_id
      WHERE blocks_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `);

    const results = ftsStmt.all(query, limit);
    return z.array(BlockSchema).parse(results);
  }

  /**
   * Search for both pages and blocks based on a query string
   */
  searchAll(query: string, limit: number = 10, escapeSpecialChars: boolean = true): [Page[], Block[]] {
    // Handle empty query gracefully by returning empty lists
    if (!query || query.trim() === "") {
      return [[], []];
    }

    const pages = this.searchPages(query, limit, escapeSpecialChars);
    const blocks = this.searchBlocks(query, limit, escapeSpecialChars);
    return [pages, blocks];
  }

  /**
   * Rebuild the search index
   */
  rebuildSearch(): void {
    // Rebuild FTS tables
    this.db.exec('INSERT INTO pages_fts(pages_fts) VALUES(\'rebuild\')');
    this.db.exec('INSERT INTO blocks_fts(blocks_fts) VALUES(\'rebuild\')');
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
  }

  /**
   * Escape a whole string and split it into safe literal tokens
   * for an FTS MATCH expression.
   * Note: This uses text.split() which works for space-separated languages.
   * For languages like Chinese/Japanese/Korean without spaces between words,
   * a more sophisticated tokenization approach would be needed.
   */
  private _ftsEscapeTokens(text: string): string {
    const tokens = text.split(/\s+/);
    const escapedTokens = tokens.map(t => `"${t.replace(/"/g, '""')}"*`);
    return escapedTokens.join(' ');
  }

  /**
   * Creates a default workspace if it doesn't exist.
   */
  private createDefaultWorkspace(): void {
    // Check if default workspace with ID 0 already exists
    const stmt = this.db.prepare('SELECT 1 FROM workspaces WHERE workspace_id = 0');
    const existing = stmt.get();

    if (!existing) {
      const defaultName = 'Default';
      const defaultColor = Buffer.from('4285F4', 'hex'); // Color as BLOB
      const insertStmt = this.db.prepare(
        'INSERT INTO workspaces (workspace_id, name, color) VALUES (?, ?, ?)'
      );
      insertStmt.run(0, defaultName, defaultColor);
    }
  }
}
