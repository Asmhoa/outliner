import {
  UserDatabaseInfo,
  Page,
  Block,
  Workspace
} from './entities';

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
  updateUserDatabase(id: string, newName?: string): Promise<boolean>;
  deleteUserDatabase(id: string): Promise<boolean>; // Also removes the actual database file
  close(): void;
}

/**
 * Interface for user database operations
 */
export interface IUserDatabase extends IDatabaseConnection {
  // Methods for page operations
  addPage(title: string): string;          // Returns page ID
  getPageById(id: string): Page;
  getAllPages(): Page[];
  updatePageTitle(id: string, newTitle: string): void;
  deletePage(id: string): void;

  // Methods for block operations
  addBlock(content: string, position: number, type: string, pageId?: string, parentBlockId?: string): string; // Returns block ID
  getBlockById(id: string): Block;
  getBlocksByPageId(pageId: string): Block[];
  updateBlockContent(id: string, newContent: string): void;
  updateBlockParent(id: string, newPageId?: string, newParentBlockId?: string): void;
  updateBlockPosition(blockId: string, newPosition: number): void;
  deleteBlock(id: string): void;

  // Methods for workspace operations
  addWorkspace(name: string, color: string): number; // Returns workspace ID
  getWorkspaceById(id: number): Workspace;
  getAllWorkspaces(): Workspace[];
  updateWorkspace(id: number, name: string, color: string): void;
  deleteWorkspace(id: number): void;

  // Search functionality
  searchPages(query: string): Page[];
  searchBlocks(query: string): Block[];

  // Connection management
  close(): void;
}
