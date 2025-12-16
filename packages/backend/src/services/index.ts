import { 
  ISystemDatabase, 
  IUserDatabase, 
  UserDatabaseInfo, 
  Page, 
  Block, 
  Workspace 
} from '../database/interfaces';
import { SystemDatabase } from '../database/system';
import { UserDatabase } from '../database/user';
import { 
  PageNotFoundError, 
  BlockNotFoundError, 
  WorkspaceNotFoundError, 
  UserDatabaseNotFoundError 
} from '../database/errors';

/**
 * Service class for handling system database operations
 */
export class SystemDatabaseService {
  private systemDb: ISystemDatabase;

  constructor(dbPath: string) {
    this.systemDb = new SystemDatabase(dbPath);
  }

  /**
   * Get all user databases
   */
  getAllUserDatabases(): UserDatabaseInfo[] {
    return this.systemDb.getAllUserDatabases();
  }

  /**
   * Get a specific user database by ID
   */
  getUserDatabaseById(id: string): UserDatabaseInfo | null {
    const dbInfo = this.systemDb.getUserDatabaseById(id);
    if (!dbInfo) {
      throw new UserDatabaseNotFoundError(`User database with id '${id}' not found`);
    }
    return dbInfo;
  }

  /**
   * Add a new user database
   */
  addUserDatabase(name: string, path: string): UserDatabaseInfo {
    return this.systemDb.addUserDatabase(name, path);
  }

  /**
   * Update an existing user database
   */
  updateUserDatabase(id: string, name: string): boolean {
    const exists = this.systemDb.getUserDatabaseById(id);
    if (!exists) {
      throw new UserDatabaseNotFoundError(`User database with id '${id}' not found`);
    }
    return this.systemDb.updateUserDatabase(id, name);
  }

  /**
   * Remove a user database
   */
  removeUserDatabase(id: string): boolean {
    const exists = this.systemDb.getUserDatabaseById(id);
    if (!exists) {
      throw new UserDatabaseNotFoundError(`User database with id '${id}' not found`);
    }
    return this.systemDb.removeUserDatabase(id);
  }

  close(): void {
    this.systemDb.close();
  }
}

/**
 * Service class for handling user database operations
 */
export class UserDatabaseService {
  private userDb: IUserDatabase;

  constructor(dbPath: string) {
    this.userDb = new UserDatabase(dbPath);
  }

  /**
   * Page operations
   */
  addPage(title: string): number {
    // Check if a page with this title already exists
    const allPages = this.userDb.getAllPages();
    const existingPage = allPages.find(page => page.title === title);
    if (existingPage) {
      throw new Error(`Page with title '${title}' already exists`);
    }
    
    return this.userDb.addPage(title);
  }

  getPageById(id: number): Page | null {
    const page = this.userDb.getPageById(id);
    if (!page) {
      throw new PageNotFoundError(`Page with id '${id}' not found`);
    }
    return page;
  }

  getAllPages(): Page[] {
    return this.userDb.getAllPages();
  }

  updatePageTitle(id: number, newTitle: string): boolean {
    const page = this.userDb.getPageById(id);
    if (!page) {
      throw new PageNotFoundError(`Page with id '${id}' not found`);
    }
    return this.userDb.updatePageTitle(id, newTitle);
  }

  deletePage(id: number): boolean {
    const page = this.userDb.getPageById(id);
    if (!page) {
      throw new PageNotFoundError(`Page with id '${id}' not found`);
    }
    return this.userDb.deletePage(id);
  }

  /**
   * Block operations
   */
  addBlock(
    content: string, 
    position: number, 
    type: string, 
    pageId?: number, 
    parentBlockId?: number
  ): number {
    return this.userDb.addBlock(content, position, type, pageId, parentBlockId);
  }

  getBlockById(id: number): Block | null {
    const block = this.userDb.getBlockById(id);
    if (!block) {
      throw new BlockNotFoundError(`Block with id '${id}' not found`);
    }
    return block;
  }

  getBlocksByPageId(pageId: number): Block[] {
    return this.userDb.getBlocksByPageId(pageId);
  }

  updateBlockContent(id: number, newContent: string): boolean {
    const block = this.userDb.getBlockById(id);
    if (!block) {
      throw new BlockNotFoundError(`Block with id '${id}' not found`);
    }
    return this.userDb.updateBlockContent(id, newContent);
  }

  updateBlockParent(
    id: number, 
    newPageId?: number, 
    newParentBlockId?: number
  ): boolean {
    const block = this.userDb.getBlockById(id);
    if (!block) {
      throw new BlockNotFoundError(`Block with id '${id}' not found`);
    }
    return this.userDb.updateBlockParent(id, newPageId, newParentBlockId);
  }

  updateBlockPosition(blockId: number, newPosition: number, parentId?: number): boolean {
    const block = this.userDb.getBlockById(blockId);
    if (!block) {
      throw new BlockNotFoundError(`Block with id '${blockId}' not found`);
    }
    return this.userDb.updateBlockPosition(blockId, newPosition, parentId);
  }

  deleteBlock(id: number): boolean {
    const block = this.userDb.getBlockById(id);
    if (!block) {
      throw new BlockNotFoundError(`Block with id '${id}' not found`);
    }
    return this.userDb.deleteBlock(id);
  }

  /**
   * Workspace operations
   */
  addWorkspace(name: string, color: string): number {
    return this.userDb.addWorkspace(name, color);
  }

  getWorkspaceById(id: number): Workspace | null {
    const workspace = this.userDb.getWorkspaceById(id);
    if (!workspace) {
      throw new WorkspaceNotFoundError(`Workspace with id '${id}' not found`);
    }
    return workspace;
  }

  getAllWorkspaces(): Workspace[] {
    return this.userDb.getAllWorkspaces();
  }

  updateWorkspace(id: number, name: string, color: string): boolean {
    const workspace = this.userDb.getWorkspaceById(id);
    if (!workspace) {
      throw new WorkspaceNotFoundError(`Workspace with id '${id}' not found`);
    }
    return this.userDb.updateWorkspace(id, name, color);
  }

  deleteWorkspace(id: number): boolean {
    const workspace = this.userDb.getWorkspaceById(id);
    if (!workspace) {
      throw new WorkspaceNotFoundError(`Workspace with id '${id}' not found`);
    }
    return this.userDb.deleteWorkspace(id);
  }

  /**
   * Search operations
   */
  searchPages(query: string): Page[] {
    return this.userDb.searchPages(query);
  }

  searchBlocks(query: string): Block[] {
    return this.userDb.searchBlocks(query);
  }

  close(): void {
    this.userDb.close();
  }
}

/**
 * Main service class to coordinate operations between system and user databases
 */
export class DatabaseService {
  private systemDbService: SystemDatabaseService;

  constructor(systemDbPath: string) {
    this.systemDbService = new SystemDatabaseService(systemDbPath);
  }

  /**
   * Get a user database service for a specific user database
   */
  getUserDatabaseService(dbId: string): UserDatabaseService {
    const dbInfo = this.systemDbService.getUserDatabaseById(dbId);
    if (!dbInfo) {
      throw new UserDatabaseNotFoundError(`User database with id '${dbId}' not found`);
    }
    return new UserDatabaseService(dbInfo.path);
  }

  /**
   * Proxy methods for system database operations
   */
  getAllUserDatabases() {
    return this.systemDbService.getAllUserDatabases();
  }

  addUserDatabase(name: string, path: string) {
    return this.systemDbService.addUserDatabase(name, path);
  }

  updateUserDatabase(id: string, name: string) {
    return this.systemDbService.updateUserDatabase(id, name);
  }

  removeUserDatabase(id: string) {
    return this.systemDbService.removeUserDatabase(id);
  }

  close(): void {
    this.systemDbService.close();
  }
}