/**
 * Data object models representing database entities
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