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
  // Method to get all user databases
  getAllUserDatabases(): UserDatabaseInfo[];

  // Method to get a specific user database by ID
  getUserDatabaseById(id: string): UserDatabaseInfo | null;

  // Method to add a new user database
  addUserDatabase(name: string, path: string): UserDatabaseInfo;

  // Method to update an existing user database
  updateUserDatabase(id: string, name: string): boolean;

  // Method to remove a user database
  removeUserDatabase(id: string): boolean;
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

/**
 * Type definitions for database entities
 */
export interface UserDatabaseInfo {
  id: string;
  name: string;
  path: string;
  createdAt: Date;
}

export interface Page {
  id: number;
  title: string;
  workspaceId?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Block {
  id: number;
  content: string;
  position: number;
  type: string;
  pageId: number;
  parentBlockId?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Workspace {
  id: number;
  name: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}