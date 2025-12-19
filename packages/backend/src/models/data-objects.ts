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
  id: string;
  title: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Block {
  id: string;
  content: string;
  position: number;
  type: string;
  pageId?: string;
  parentBlockId?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Workspace {
  id: number;
  name: string;
  color: string;
  createdAt?: Date;
  updatedAt?: Date;
}