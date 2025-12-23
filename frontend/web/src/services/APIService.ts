// Define the types directly instead of importing from generated client
export interface Database {
  id: string;
  name: string;
  path: string;
  created_at: string;
}

export interface Page {
  page_id: string;
  title: string;
  created_at: string;
}

export interface Block {
  block_id: string;
  content: string;
  page_id?: string | null;
  parent_block_id?: string | null;
  position: number;
  type?: string;
  created_at: string;
}

export interface Workspace {
  workspace_id: number;
  name: string;
  color: string;
}

export interface HTTPError {
  status?: number;
  body?: {
    detail?: string;
  };
}

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
  addWorkspace(dbId: string, name: string, color?: string): Promise<{ data: Workspace | null; error: any }>;
  updateWorkspace(dbId: string, workspaceId: string, name: string, color?: string): Promise<{ error: any; response?: Response }>;
  deleteWorkspace(dbId: string, workspaceId: string): Promise<{ error: any; response?: Response }>;
  getWorkspace(dbId: string, workspaceId: string): Promise<{ data: Workspace | null; error: any }>;

  // Search operations
  search(dbId: string, query: string): Promise<{ data: any; error: any }>;
  rebuildSearch(dbId: string): Promise<{ error: any; response?: Response }>;
}

const API_BASE_URL = 'http://127.0.0.1:8000';

export class APIService implements APIServiceInterface {
  private async request<T>(path: string, options: RequestInit = {}): Promise<{ data: T | null; error: any; response?: Response }> {
    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      const responseData = response.status !== 204 ? await response.json() : null;

      if (!response.ok) {
        return { data: null, error: responseData || { message: `HTTP ${response.status}` }, response };
      }

      return { data: responseData, error: null, response };
    } catch (error) {
      return { data: null, error, response: undefined };
    }
  }

  // Database operations
  async getDatabases(): Promise<{ data: Database[] | null; error: any }> {
    return this.request<Database[]>('/databases', { method: 'GET' });
  }

  async createDatabase(name: string): Promise<{ data: Database | null; error: any; response?: Response }> {
    return this.request<Database>('/databases', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
  }

  async deleteDatabase(dbId: string): Promise<{ error: any; response?: Response }> {
    const result = await this.request(`/databases/${dbId}`, { method: 'DELETE' });
    return { error: result.error, response: result.response };
  }

  async getDatabase(dbId: string): Promise<{ data: Database | null; error: any }> {
    return this.request<Database>(`/databases/${dbId}`, { method: 'GET' });
  }

  async updateDatabase(dbId: string, name: string): Promise<{ error: any; response?: Response }> {
    const result = await this.request(`/databases/${dbId}`, {
      method: 'PUT',
      body: JSON.stringify({ name })
    });
    return { error: result.error, response: result.response };
  }

  // Page operations
  async getPages(dbId: string): Promise<{ data: Page[] | null; error: any }> {
    return this.request<Page[]>(`/db/${dbId}/pages`, { method: 'GET' });
  }

  async addPage(dbId: string, title: string): Promise<{ data: Page | null; error: any; response?: Response }> {
    return this.request<Page>(`/db/${dbId}/pages`, {
      method: 'POST',
      body: JSON.stringify({ title })
    });
  }

  async renamePage(dbId: string, pageId: string, newTitle: string): Promise<{ error: any; response?: Response }> {
    const result = await this.request(`/db/${dbId}/pages`, {
      method: 'PUT',
      body: JSON.stringify({ page_id: pageId, new_title: newTitle })
    });
    return { error: result.error, response: result.response };
  }

  async deletePage(dbId: string, pageId: string): Promise<{ error: any; response?: Response }> {
    const result = await this.request(`/db/${dbId}/pages/${pageId}`, { method: 'DELETE' });
    return { error: result.error, response: result.response };
  }

  async getPage(dbId: string, pageId: string): Promise<{ data: Page | null; error: any }> {
    return this.request<Page>(`/db/${dbId}/pages/${pageId}`, { method: 'GET' });
  }

  // Block operations
  async getBlocks(dbId: string, pageId: string): Promise<{ data: Block[] | null; error: any }> {
    return this.request<Block[]>(`/db/${dbId}/blocks/${pageId}`, { method: 'GET' });
  }

  async addBlock(dbId: string, pageId: string, content: string, position: number, type: string): Promise<{ data: Block | null; error: any }> {
    console.error('APIService addBlock called with:', { dbId, pageId, content, position, type });

    // Ensure required fields are present
    if (!dbId || !pageId || content === undefined || position === undefined) {
      console.error('APIService addBlock missing required parameters:', { dbId, pageId, content, position, type });
      return { data: null, error: { message: 'Missing required parameters for addBlock' } };
    }

    const body = {
      content,
      position,
      type,
      page_id: pageId
    };

    console.error('APIService addBlock sending body:', body);

    return this.request<Block>(`/db/${dbId}/blocks`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async getBlock(dbId: string, blockId: string): Promise<{ data: Block | null; error: any }> {
    return this.request<Block>(`/db/${dbId}/block/${blockId}`, { method: 'GET' });
  }

  async updateBlockContent(dbId: string, blockId: string, newContent: string): Promise<{ error: any }> {
    const result = await this.request(`/db/${dbId}/blocks/content`, {
      method: 'PUT',
      body: JSON.stringify({ block_id: blockId, new_content: newContent })
    });
    return { error: result.error };
  }

  async updateBlockPosition(dbId: string, blockId: string, newPosition: number): Promise<{ error: any }> {
    const result = await this.request(`/db/${dbId}/blocks/position`, {
      method: 'PUT',
      body: JSON.stringify({ block_id: blockId, new_position: newPosition })
    });
    return { error: result.error };
  }

  async updateBlockParent(dbId: string, blockId: string, newParentId: string | null): Promise<{ error: any }> {
    const result = await this.request(`/db/${dbId}/blocks/parent`, {
      method: 'PUT',
      body: JSON.stringify({ block_id: blockId, new_page_id: null, new_parent_block_id: newParentId })
    });
    return { error: result.error };
  }

  async deleteBlock(dbId: string, blockId: string): Promise<{ error: any }> {
    const result = await this.request(`/db/${dbId}/blocks/${blockId}`, { method: 'DELETE' });
    return { error: result.error };
  }

  // Workspace operations
  async getWorkspaces(dbId: string): Promise<{ data: Workspace[] | null; error: any }> {
    return this.request<Workspace[]>(`/db/${dbId}/workspaces`, { method: 'GET' });
  }

  async addWorkspace(dbId: string, name: string, color: string = '#000000'): Promise<{ data: Workspace | null; error: any }> {
    return this.request<Workspace>(`/db/${dbId}/workspaces`, {
      method: 'POST',
      body: JSON.stringify({ name, color })
    });
  }

  async updateWorkspace(dbId: string, workspaceId: string, name: string, color: string = '#000000'): Promise<{ error: any; response?: Response }> {
    const result = await this.request(`/db/${dbId}/workspaces`, {
      method: 'PUT',
      body: JSON.stringify({
        workspace_id: parseInt(workspaceId),
        new_name: name,
        new_color: color
      })
    });
    return { error: result.error, response: result.response };
  }

  async deleteWorkspace(dbId: string, workspaceId: string): Promise<{ error: any; response?: Response }> {
    const result = await this.request(`/db/${dbId}/workspaces/${workspaceId}`, { method: 'DELETE' });
    return { error: result.error, response: result.response };
  }

  async getWorkspace(dbId: string, workspaceId: string): Promise<{ data: Workspace | null; error: any }> {
    return this.request<Workspace>(`/db/${dbId}/workspaces/${workspaceId}`, { method: 'GET' });
  }

  // Search operations
  async search(dbId: string, query: string): Promise<{ data: any; error: any }> {
    return this.request<any>(`/db/${dbId}/search`, {
      method: 'POST',
      body: JSON.stringify({ query })
    });
  }

  async rebuildSearch(dbId: string): Promise<{ error: any; response?: Response }> {
    const result = await this.request(`/db/${dbId}/rebuild-search`, { method: 'POST' });
    return { error: result.error, response: result.response };
  }
}