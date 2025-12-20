import { UserDatabase } from './user';
import {
  PageNotFoundError,
  PageAlreadyExistsError,
  BlockNotFoundError,
  WorkspaceNotFoundError
} from './errors';

describe('UserDatabase', () => {
  let db: UserDatabase;

  beforeEach(() => {
    // Create a new in-memory database for each test
    db = new UserDatabase(':memory:');
  });

  afterEach(() => {
    // Close the database connection after each test
    db.close();
  });

  test('initializeTables should create required tables', () => {
    // Test if tables are created by checking if they exist
    const checkPagesTable = db['db'].prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='pages'
    `);
    const pagesResult = checkPagesTable.get();
    expect(pagesResult).not.toBeNull();

    const checkBlocksTable = db['db'].prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='blocks'
    `);
    const blocksResult = checkBlocksTable.get();
    expect(blocksResult).not.toBeNull();
  });

  test('addPage should add a new page', () => {
    const pageId = db.addPage('Test Page');
    expect(typeof pageId).toBe('string');

    const page = db.getPageById(pageId);
    expect(page.title).toBe('Test Page');
  });

  test('updatePageTitle should rename a page', () => {
    const pageId = db.addPage('Old Title');

    // Rename the page
    db.updatePageTitle(pageId, 'New Title');

    // Verify the change
    const updatedPage = db.getPageById(pageId);
    expect(updatedPage.title).toBe('New Title');
  });

  test('updatePageTitle should throw error when renaming non-existent page', () => {
    expect(() => {
      db.updatePageTitle('non_existent_id', 'New Title');
    }).toThrow(PageNotFoundError);
  });

  test('addPage should throw error when adding page with duplicate title', () => {
    // Add the first page
    const pageId1 = db.addPage('Test Page');
    expect(typeof pageId1).toBe('string');

    // Try to add a second page with the same title - should raise PageAlreadyExistsError
    expect(() => {
      db.addPage('Test Page');
    }).toThrow(PageAlreadyExistsError);

    // Verify only one page exists in the database
    const allPages = db.getAllPages();
    expect(allPages).toHaveLength(1);
  });

  test('updatePageTitle should throw error when renaming page to existing title', () => {
    // Add two pages with different titles
    const pageId1 = db.addPage('Page One');
    const pageId2 = db.addPage('Page Two');

    // Try to rename page 2 to page 1's title - should raise PageAlreadyExistsError
    expect(() => {
      db.updatePageTitle(pageId2, 'Page One');
    }).toThrow(PageAlreadyExistsError);

    // Verify page 2 still has its original title
    const page2 = db.getPageById(pageId2);
    expect(page2.title).toBe('Page Two');

    // Verify page 1 still has its original title
    const page1 = db.getPageById(pageId1);
    expect(page1.title).toBe('Page One');
  });

  test('deletePage should delete a page', () => {
    const pageId = db.addPage('Test Page');

    db.deletePage(pageId);

    // Verify the page is no longer retrievable
    expect(() => {
      db.getPageById(pageId);
    }).toThrow(PageNotFoundError);
  });

  test('deletePage should throw error when deleting non-existent page', () => {
    expect(() => {
      db.deletePage('non_existent_id');
    }).toThrow(PageNotFoundError);
  });

  test('addBlock should add a block to a page', () => {
    const pageId = db.addPage('Test Page');
    const blockId = db.addBlock('Test Block', 1, 'text', pageId);

    expect(typeof blockId).toBe('string');

    const block = db.getBlockById(blockId);
    expect(block.content).toBe('Test Block');
  });

  test('addBlock should add a block as a child of another block', () => {
    const pageId = db.addPage('Test Page');
    const parentBlockId = db.addBlock('Parent Block', 1, 'text', pageId);
    const childBlockId = db.addBlock('Child Block', 1, 'text', undefined, parentBlockId);

    expect(typeof childBlockId).toBe('string');

    const childBlock = db.getBlockById(childBlockId);
    expect(childBlock.content).toBe('Child Block');
    expect(childBlock.parentBlockId).toBe(parentBlockId);
  });

  test('addBlock should throw error when adding block with both page_id and parent_block_id', () => {
    const pageId = db.addPage('Test Page');
    const parentBlockId = db.addBlock('Parent Block', 1, 'text', pageId);

    expect(() => {
      db.addBlock('Test Block', 1, 'text', pageId, parentBlockId);
    }).toThrow(/A block must be associated with either a page_id or a parent_block_id, but not both/);
  });

  test('deleteBlock should delete a block', () => {
    const pageId = db.addPage('Test Page');
    const blockId = db.addBlock('Test Block', 1, 'text', pageId);

    db.deleteBlock(blockId);

    // Verify the block is no longer retrievable
    expect(() => {
      db.getBlockById(blockId);
    }).toThrow(BlockNotFoundError);
  });

  test('deleteBlock should throw error when deleting non-existent block', () => {
    expect(() => {
      db.deleteBlock('non_existent_id');
    }).toThrow(BlockNotFoundError);
  });

  test('deletePage should cascade delete its blocks', () => {
    const pageId = db.addPage('Test Page');
    const blockId = db.addBlock('Test Block', 1, 'text', pageId);

    db.deletePage(pageId);

    // Verify the block is also deleted (due to CASCADE constraint)
    expect(() => {
      db.getBlockById(blockId);
    }).toThrow(BlockNotFoundError);
  });

  test('deleteBlock should cascade delete its child blocks', () => {
    const pageId = db.addPage('Test Page');
    const parentBlockId = db.addBlock('Parent Block', 1, 'text', pageId);
    const childBlockId = db.addBlock('Child Block', 1, 'text', undefined, parentBlockId);

    db.deleteBlock(parentBlockId);

    // Verify the child block is also deleted (due to CASCADE constraint)
    expect(() => {
      db.getBlockById(childBlockId);
    }).toThrow(BlockNotFoundError);
  });

  test('updateBlockContent should update the content of a block', () => {
    const pageId = db.addPage('Test Page');
    const blockId = db.addBlock('Original Content', 1, 'text', pageId);

    // Update the content
    db.updateBlockContent(blockId, 'New Content');

    // Verify the change
    const updatedBlock = db.getBlockById(blockId);
    expect(updatedBlock.content).toBe('New Content');
  });

  test('updateBlockContent should throw error when updating content of non-existent block', () => {
    expect(() => {
      db.updateBlockContent('non_existent_id', 'New Content');
    }).toThrow(BlockNotFoundError);
  });

  test('updateBlockParent should update a block\'s parent to a different page', () => {
    const pageId1 = db.addPage('Page One');
    const pageId2 = db.addPage('Page Two');
    const blockId = db.addBlock('Block on Page One', 1, 'text', pageId1);

    // Move the block to a different page
    db.updateBlockParent(blockId, pageId2);

    // Verify the change
    const updatedBlock = db.getBlockById(blockId);
    expect(updatedBlock.pageId).toBe(pageId2);
    expect(updatedBlock.parentBlockId).toBeNull();
  });

  test('updateBlockParent should update a block\'s parent to a different block', () => {
    const pageId = db.addPage('Test Page');
    const parentBlockId1 = db.addBlock('Parent Block One', 1, 'text', pageId);
    const parentBlockId2 = db.addBlock('Parent Block Two', 2, 'text', pageId);
    const blockId = db.addBlock('Child Block', 1, 'text', undefined, parentBlockId1);

    // Change the parent to the second parent block
    db.updateBlockParent(blockId, undefined, parentBlockId2);

    // Verify the change
    const updatedBlock = db.getBlockById(blockId);
    expect(updatedBlock.pageId).toBeNull();
    expect(updatedBlock.parentBlockId).toBe(parentBlockId2);
  });

  test('updateBlockParent should move a block from a page to be a child of another block', () => {
    const pageId = db.addPage('Test Page');
    const parentBlockId = db.addBlock('Parent Block', 1, 'text', pageId);
    const blockId = db.addBlock('Block on Page', 1, 'text', pageId);

    // Move the block to be a child of another block
    db.updateBlockParent(blockId, undefined, parentBlockId);

    // Verify the change
    const updatedBlock = db.getBlockById(blockId);
    expect(updatedBlock.pageId).toBeNull();
    expect(updatedBlock.parentBlockId).toBe(parentBlockId);
  });

  test('updateBlockParent should move a block from a parent block to be directly under a page', () => {
    const pageId1 = db.addPage('Page One');
    const pageId2 = db.addPage('Page Two');
    const parentBlockId = db.addBlock('Parent Block', 1, 'text', pageId1);
    const blockId = db.addBlock('Child Block', 1, 'text', undefined, parentBlockId);

    // Move the block to a different page
    db.updateBlockParent(blockId, pageId2);

    // Verify the change
    const updatedBlock = db.getBlockById(blockId);
    expect(updatedBlock.pageId).toBe(pageId2);
    expect(updatedBlock.parentBlockId).toBeNull();
  });

  test('updateBlockParent should throw error when updating block parent with both page_id and parent_block_id', () => {
    const pageId = db.addPage('Test Page');
    const blockId = db.addBlock('Test Block', 1, 'text', pageId);

    expect(() => {
      db.updateBlockParent(blockId, pageId, blockId);
    }).toThrow(/A block must be associated with either a page_id or a parent_block_id, but not both/);
  });

  test('updateBlockParent should throw error when updating block parent with neither page_id nor parent_block_id', () => {
    const pageId = db.addPage('Test Page');
    const blockId = db.addBlock('Test Block', 1, 'text', pageId);

    expect(() => {
      db.updateBlockParent(blockId);
    }).toThrow(/A block must be associated with either a page_id or a parent_block_id, but not both/);
  });

  test('updateBlockParent should throw error when updating parent of non-existent block', () => {
    const pageId = db.addPage('Test Page');

    expect(() => {
      db.updateBlockParent('non_existent_id', pageId);
    }).toThrow(BlockNotFoundError);
  });

  test('addWorkspace should add a new workspace', () => {
    const workspaceId = db.addWorkspace('Test Workspace', '#FF0000');

    expect(typeof workspaceId).toBe('number');

    const workspace = db.getWorkspaceById(workspaceId);
    expect(workspace.name).toBe('Test Workspace');
    expect(workspace.color).toBe('#ff0000');
  });

  test('getWorkspaceById should retrieve a workspace by its ID', () => {
    const workspaceId = db.addWorkspace('Test Workspace', '#00FF00');

    const workspace = db.getWorkspaceById(workspaceId);

    expect(workspace.id).toBe(workspaceId);
    expect(workspace.name).toBe('Test Workspace');
    expect(workspace.color).toBe('#00ff00');
  });

  test('getAllWorkspaces should retrieve all workspaces', () => {
    db.addWorkspace('Workspace 1', '#FF0000');
    db.addWorkspace('Workspace 2', '#00FF00');

    const workspaces = db.getAllWorkspaces();

    // Should include the default workspace plus the two we added
    expect(workspaces).toHaveLength(3);

    // Find the specific workspaces we added
    const workspace1 = workspaces.find(w => w.name === 'Workspace 1');
    const workspace2 = workspaces.find(w => w.name === 'Workspace 2');

    expect(workspace1).toBeDefined();
    expect(workspace1?.name).toBe('Workspace 1');
    expect(workspace1?.color).toBe('#ff0000');

    expect(workspace2).toBeDefined();
    expect(workspace2?.name).toBe('Workspace 2');
    expect(workspace2?.color).toBe('#00ff00');
  });

  test('updateWorkspace should update an existing workspace', () => {
    const workspaceId = db.addWorkspace('Old Title', '#FF0000');

    // Update the workspace
    db.updateWorkspace(workspaceId, 'New Title', '#0000FF');

    // Verify the change
    const updatedWorkspace = db.getWorkspaceById(workspaceId);
    expect(updatedWorkspace.name).toBe('New Title');
    expect(updatedWorkspace.color).toBe('#0000ff');
  });

  test('updateWorkspace should throw error when updating non-existent workspace', () => {
    expect(() => {
      db.updateWorkspace(999, 'New Title', '#0000FF');
    }).toThrow(WorkspaceNotFoundError);
  });

  test('deleteWorkspace should delete a workspace', () => {
    const workspaceId = db.addWorkspace('Test Workspace', '#FF0000');

    db.deleteWorkspace(workspaceId);

    // Verify the workspace is no longer retrievable
    expect(() => {
      db.getWorkspaceById(workspaceId);
    }).toThrow(WorkspaceNotFoundError);
  });

  test('deleteWorkspace should throw error when deleting non-existent workspace', () => {
    expect(() => {
      db.deleteWorkspace(999);
    }).toThrow(WorkspaceNotFoundError);
  });
});
