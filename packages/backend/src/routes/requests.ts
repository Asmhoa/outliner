// Request body types
export interface DatabaseCreate {
  name: string;
  path: string;
}

export interface DatabaseUpdate {
  name: string;
}

export interface PageCreate {
  title: string;
}

export interface PageRename {
  page_id: string;
  new_title: string;
}

export interface BlockCreate {
  content: string;
  position: number;
  type?: string;  // default to "text"
  page_id?: string;
  parent_block_id?: string;
}

export interface BlockUpdateContent {
  block_id: string;
  new_content: string;
}

export interface BlockUpdateParent {
  block_id: string;
  new_page_id?: string;
  new_parent_block_id?: string;
}

export interface BlockUpdatePosition {
  block_id: string;
  new_position: number;
  new_parent_block_id?: string;
}

export interface WorkspaceCreate {
  name: string;
  color: string;
}

export interface WorkspaceUpdate {
  name: string;
  color: string;
}

export interface SearchRequest {
  query: string;
}
