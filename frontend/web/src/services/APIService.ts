import {
  // Database functions
  getDatabasesDatabasesGet,
  createDatabaseDatabasesPost,
  deleteDatabaseDatabasesDbIdDelete,
  getDatabaseDatabasesDbIdGet,
  updateDatabaseDatabasesDbIdPut,
  
  // Page functions
  getPagesDbDbIdPagesGet,
  addPageDbDbIdPagesPost,
  renamePageDbDbIdPagesPut,
  deletePageDbDbIdPagesPageIdDelete,
  getPageDbDbIdPagesPageIdGet,
  
  // Block functions
  getBlocksDbDbIdBlocksPageIdGet,
  addBlockDbDbIdBlocksPost,
  getBlockDbDbIdBlockBlockIdGet,
  updateBlockContentDbDbIdBlocksContentPut,
  updateBlockPositionDbDbIdBlocksPositionPut,
  updateBlockParentDbDbIdBlocksParentPut,
  deleteBlockDbDbIdBlocksBlockIdDelete,
  
  // Workspace functions
  getWorkspacesDbDbIdWorkspacesGet,
  addWorkspaceDbDbIdWorkspacesPost,
  updateWorkspaceDbDbIdWorkspacesPut,
  deleteWorkspaceDbDbIdWorkspacesWorkspaceIdDelete,
  getWorkspaceDbDbIdWorkspacesWorkspaceIdGet,
  
  // Search functions
  searchDbDbIdSearchPost,
  rebuildSearchDbDbIdRebuildSearchPost,
  
  // Types
  type Database,
  type Page,
  type Block,
  type Workspace,
  type BlockUpdateContent,
  type BlockUpdatePosition,
  type BlockUpdateParent,
  type HTTPError
} from '../api-client';

export interface APIServiceInterface {
  // Database operations
  getDatabases(): Promise<{ data: Database[] | null; error: any }>;
  createDatabase(name: string): Promise<{ data: Database | null; error: any; response?: Response }>;
  deleteDatabase(dbId: string): Promise<{ error: any; response?: Response }>;
  getDatabase(dbId: string): Promise<{ data: Database | null; error: any }>;
  updateDatabase(dbId: string, name: string): Promise<{ error: any; response?: Response }>;

  // Page operations
  getPages(dbId: string): Promise<{ data: Page[] | null; error: any }>;
  addPage(dbId: string, title: string): Promise<{ data: Page | null; error: any; response?: Response }>;
  renamePage(dbId: string, pageId: string, newTitle: string): Promise<{ error: any; response?: Response }>;
  deletePage(dbId: string, pageId: string): Promise<{ error: any; response?: Response }>;
  getPage(dbId: string, pageId: string): Promise<{ data: Page | null; error: any }>;

  // Block operations
  getBlocks(dbId: string, pageId: string): Promise<{ data: Block[] | null; error: any }>;
  addBlock(dbId: string, pageId: string, content: string, position: number, type: string): Promise<{ data: Block | null; error: any }>;
  getBlock(dbId: string, blockId: string): Promise<{ data: Block | null; error: any }>;
  updateBlockContent(dbId: string, blockId: string, newContent: string): Promise<{ error: any }>;
  updateBlockPosition(dbId: string, blockId: string, newPosition: number): Promise<{ error: any }>;
  updateBlockParent(dbId: string, blockId: string, newParentId: string | null): Promise<{ error: any }>;
  deleteBlock(dbId: string, blockId: string): Promise<{ error: any }>;

  // Workspace operations
  getWorkspaces(dbId: string): Promise<{ data: Workspace[] | null; error: any }>;
  addWorkspace(dbId: string, name: string): Promise<{ data: Workspace | null; error: any }>;
  updateWorkspace(dbId: string, workspaceId: string, name: string): Promise<{ error: any; response?: Response }>;
  deleteWorkspace(dbId: string, workspaceId: string): Promise<{ error: any; response?: Response }>;
  getWorkspace(dbId: string, workspaceId: string): Promise<{ data: Workspace | null; error: any }>;

  // Search operations
  search(dbId: string, query: string): Promise<{ data: any; error: any }>;
  rebuildSearch(dbId: string): Promise<{ error: any; response?: Response }>;
}

export class APIService implements APIServiceInterface {
  // Database operations
  async getDatabases(): Promise<{ data: Database[] | null; error: any }> {
    return await getDatabasesDatabasesGet();
  }

  async createDatabase(name: string): Promise<{ data: Database | null; error: any; response?: Response }> {
    return await createDatabaseDatabasesPost({
      body: { name }
    });
  }

  async deleteDatabase(dbId: string): Promise<{ error: any; response?: Response }> {
    return await deleteDatabaseDatabasesDbIdDelete({
      path: { db_id: dbId }
    });
  }

  async getDatabase(dbId: string): Promise<{ data: Database | null; error: any }> {
    return await getDatabaseDatabasesDbIdGet({
      path: { db_id: dbId }
    });
  }

  async updateDatabase(dbId: string, name: string): Promise<{ error: any; response?: Response }> {
    return await updateDatabaseDatabasesDbIdPut({
      path: { db_id: dbId },
      body: { name }
    });
  }

  // Page operations
  async getPages(dbId: string): Promise<{ data: Page[] | null; error: any }> {
    return await getPagesDbDbIdPagesGet({
      path: { db_id: dbId }
    });
  }

  async addPage(dbId: string, title: string): Promise<{ data: Page | null; error: any; response?: Response }> {
    return await addPageDbDbIdPagesPost({
      path: { db_id: dbId },
      body: { title }
    });
  }

  async renamePage(dbId: string, pageId: string, newTitle: string): Promise<{ error: any; response?: Response }> {
    return await renamePageDbDbIdPagesPut({
      path: { db_id: dbId },
      body: { page_id: pageId, new_title: newTitle }
    });
  }

  async deletePage(dbId: string, pageId: string): Promise<{ error: any; response?: Response }> {
    return await deletePageDbDbIdPagesPageIdDelete({
      path: { db_id: dbId, page_id: pageId }
    });
  }

  async getPage(dbId: string, pageId: string): Promise<{ data: Page | null; error: any }> {
    return await getPageDbDbIdPagesPageIdGet({
      path: { db_id: dbId, page_id: pageId }
    });
  }

  // Block operations
  async getBlocks(dbId: string, pageId: string): Promise<{ data: Block[] | null; error: any }> {
    return await getBlocksDbDbIdBlocksPageIdGet({
      path: { db_id: dbId, page_id: pageId }
    });
  }

  async addBlock(dbId: string, pageId: string, content: string, position: number, type: string): Promise<{ data: Block | null; error: any }> {
    return await addBlockDbDbIdBlocksPost({
      path: { db_id: dbId },
      body: { page_id: pageId, content, position, type }
    });
  }

  async getBlock(dbId: string, blockId: string): Promise<{ data: Block | null; error: any }> {
    return await getBlockDbDbIdBlockBlockIdGet({
      path: { db_id: dbId, block_id: blockId }
    });
  }

  async updateBlockContent(dbId: string, blockId: string, newContent: string): Promise<{ error: any }> {
    return await updateBlockContentDbDbIdBlocksContentPut({
      path: { db_id: dbId },
      body: { block_id: blockId, new_content: newContent } satisfies BlockUpdateContent
    });
  }

  async updateBlockPosition(dbId: string, blockId: string, newPosition: number): Promise<{ error: any }> {
    return await updateBlockPositionDbDbIdBlocksPositionPut({
      path: { db_id: dbId },
      body: { block_id: blockId, new_position: newPosition } satisfies BlockUpdatePosition
    });
  }

  async updateBlockParent(dbId: string, blockId: string, newParentId: string | null): Promise<{ error: any }> {
    return await updateBlockParentDbDbIdBlocksParentPut({
      path: { db_id: dbId },
      body: { block_id: blockId, new_parent_id: newParentId } satisfies BlockUpdateParent
    });
  }

  async deleteBlock(dbId: string, blockId: string): Promise<{ error: any }> {
    return await deleteBlockDbDbIdBlocksBlockIdDelete({
      path: { db_id: dbId, block_id: blockId }
    });
  }

  // Workspace operations
  async getWorkspaces(dbId: string): Promise<{ data: Workspace[] | null; error: any }> {
    return await getWorkspacesDbDbIdWorkspacesGet({
      path: { db_id: dbId }
    });
  }

  async addWorkspace(dbId: string, name: string): Promise<{ data: Workspace | null; error: any }> {
    return await addWorkspaceDbDbIdWorkspacesPost({
      path: { db_id: dbId },
      body: { name }
    });
  }

  async updateWorkspace(dbId: string, workspaceId: string, name: string): Promise<{ error: any; response?: Response }> {
    return await updateWorkspaceDbDbIdWorkspacesPut({
      path: { db_id: dbId },
      body: { workspace_id: workspaceId, name }
    });
  }

  async deleteWorkspace(dbId: string, workspaceId: string): Promise<{ error: any; response?: Response }> {
    return await deleteWorkspaceDbDbIdWorkspacesWorkspaceIdDelete({
      path: { db_id: dbId, workspace_id: workspaceId }
    });
  }

  async getWorkspace(dbId: string, workspaceId: string): Promise<{ data: Workspace | null; error: any }> {
    return await getWorkspaceDbDbIdWorkspacesWorkspaceIdGet({
      path: { db_id: dbId, workspace_id: workspaceId }
    });
  }

  // Search operations
  async search(dbId: string, query: string): Promise<{ data: any; error: any }> {
    return await searchDbDbIdSearchPost({
      path: { db_id: dbId },
      body: { query }
    });
  }

  async rebuildSearch(dbId: string): Promise<{ error: any; response?: Response }> {
    return await rebuildSearchDbDbIdRebuildSearchPost({
      path: { db_id: dbId }
    });
  }
}