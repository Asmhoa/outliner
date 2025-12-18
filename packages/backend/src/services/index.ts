import {
  ISystemDatabase,
  IUserDatabase
} from '../database/interfaces';

import {
  UserDatabaseInfo,
  Page,
  Block,
  Workspace
} from '../models/data-objects';
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
  getUserDatabaseById(id: string): UserDatabaseInfo {
    return this.systemDb.getUserDatabaseById(id);
  }

  /**
   * Get a specific user database by Name
   */
  getUserDatabaseByName(name: string): UserDatabaseInfo {
    return this.systemDb.getUserDatabaseByName(name);
  }

  /**
   * Get a specific user database by Path
   */
  getUserDatabaseByPath(path: string): UserDatabaseInfo {
    return this.systemDb.getUserDatabaseByPath(path);
  }


  /**
   * Add a new user database
   */
  async addUserDatabase(name: string): Promise<UserDatabaseInfo> {
    return this.systemDb.addUserDatabase(name);
  }

  /**
   * Update an existing user database
   */
  async updateUserDatabase(id: string, name: string): Promise<boolean> {
    // Check existence (will throw UserDatabaseNotFoundError if not found)
    this.systemDb.getUserDatabaseById(id);
    return this.systemDb.updateUserDatabase(id, name);
  }

  /**
   * Remove a user database
   */
  async removeUserDatabase(id: string): Promise<boolean> {
    // Check existence (will throw UserDatabaseNotFoundError if not found)
    this.systemDb.getUserDatabaseById(id);
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
    return this.userDb.addPage(title);
  }

  getPageById(id: number): Page {
    return this.userDb.getPageById(id);
  }

  getAllPages(): Page[] {
    return this.userDb.getAllPages();
  }

  updatePageTitle(id: number, newTitle: string): boolean {
    // Check page existence (this will throw PageNotFoundError if not found)
    this.userDb.getPageById(id);
    return this.userDb.updatePageTitle(id, newTitle);
  }

  deletePage(id: number): boolean {
    // Check page existence (this will throw PageNotFoundError if not found)
    this.userDb.getPageById(id);
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

  getBlockById(id: number): Block {
    return this.userDb.getBlockById(id);
  }

  getBlocksByPageId(pageId: number): Block[] {
    return this.userDb.getBlocksByPageId(pageId);
  }

  updateBlockContent(id: number, newContent: string): boolean {
    // Check block existence (this will throw BlockNotFoundError if not found)
    this.userDb.getBlockById(id);
    return this.userDb.updateBlockContent(id, newContent);
  }

  updateBlockParent(
    id: number,
    newPageId?: number,
    newParentBlockId?: number
  ): boolean {
    // Check block existence (this will throw BlockNotFoundError if not found)
    this.userDb.getBlockById(id);
    return this.userDb.updateBlockParent(id, newPageId, newParentBlockId);
  }

  updateBlockPosition(blockId: number, newPosition: number, parentId?: number): boolean {
    // Check block existence (this will throw BlockNotFoundError if not found)
    this.userDb.getBlockById(blockId);
    return this.userDb.updateBlockPosition(blockId, newPosition, parentId);
  }

  deleteBlock(id: number): boolean {
    // Check block existence (this will throw BlockNotFoundError if not found)
    this.userDb.getBlockById(id);
    return this.userDb.deleteBlock(id);
  }

  /**
   * Workspace operations
   */
  addWorkspace(name: string, color: string): number {
    return this.userDb.addWorkspace(name, color);
  }

  getWorkspaceById(id: number): Workspace {
    return this.userDb.getWorkspaceById(id);
  }

  getAllWorkspaces(): Workspace[] {
    return this.userDb.getAllWorkspaces();
  }

  updateWorkspace(id: number, name: string, color: string): boolean {
    // Check workspace existence (this will throw WorkspaceNotFoundError if not found)
    this.userDb.getWorkspaceById(id);
    return this.userDb.updateWorkspace(id, name, color);
  }

  deleteWorkspace(id: number): boolean {
    // Check workspace existence (this will throw WorkspaceNotFoundError if not found)
    this.userDb.getWorkspaceById(id);
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
    // This will throw UserDatabaseNotFoundError if not found
    const dbInfo = this.systemDbService.getUserDatabaseById(dbId);
    return new UserDatabaseService(dbInfo.path);
  }

  /**
   * Proxy methods for system database operations
   */
  getAllUserDatabases() {
    return this.systemDbService.getAllUserDatabases();
  }

  async addUserDatabase(name: string) {
    return this.systemDbService.addUserDatabase(name);
  }

  async updateUserDatabase(id: string, name: string) {
    return this.systemDbService.updateUserDatabase(id, name);
  }

  async removeUserDatabase(id: string) {
    return this.systemDbService.removeUserDatabase(id);
  }

  close(): void {
    this.systemDbService.close();
  }
}
