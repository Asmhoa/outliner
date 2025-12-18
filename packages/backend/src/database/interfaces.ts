import {
  UserDatabaseInfo,
  Page,
  Block,
  Workspace
} from '../models/data-objects';

/**
 * Interface for database connection management
 */
export interface IDatabaseConnection {
  close(): void;
}

/**
 * Interface for system database operations
 */
export interface ISystemDatabase extends IDatabaseConnection {
  // The SystemDatabase manages CRUD operations on UserDatabases
  addUserDatabase(name: string): Promise<UserDatabaseInfo>; // Automatically calculates path from name
  getAllUserDatabases(): UserDatabaseInfo[];
  getUserDatabaseById(id: string): UserDatabaseInfo;
  getUserDatabaseByName(name: string): UserDatabaseInfo;
  getUserDatabaseByPath(path: string): UserDatabaseInfo;
  updateUserDatabase(id: string, newName?: string, newPathRelative?: string): Promise<boolean>;
  removeUserDatabase(id: string): Promise<boolean>; // Also removes the actual database file
}

/**
 * Interface for user database operations
 */
export interface IUserDatabase extends IDatabaseConnection {
  // Methods for page operations
  addPage(title: string): number;          // Returns page ID
  getPageById(id: number): Page | null;
  getAllPages(): Page[];
  updatePageTitle(id: number, newTitle: string): boolean;
  deletePage(id: number): boolean;

  // Methods for block operations
  addBlock(content: string, position: number, type: string, pageId?: number, parentBlockId?: number): number; // Returns block ID
  getBlockById(id: number): Block | null;
  getBlocksByPageId(pageId: number): Block[];
  updateBlockContent(id: number, newContent: string): boolean;
  updateBlockParent(id: number, newPageId?: number, newParentBlockId?: number): boolean;
  updateBlockPosition(blockId: number, newPosition: number, parentId?: number): boolean;
  deleteBlock(id: number): boolean;

  // Methods for workspace operations
  addWorkspace(name: string, color: string): number; // Returns workspace ID
  getWorkspaceById(id: number): Workspace | null;
  getAllWorkspaces(): Workspace[];
  updateWorkspace(id: number, name: string, color: string): boolean;
  deleteWorkspace(id: number): boolean;

  // Search functionality
  searchPages(query: string): Page[];
  searchBlocks(query: string): Block[];
}
