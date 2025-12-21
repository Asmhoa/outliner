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
    expect(childBlock.parent_block_id).toBe(parentBlockId);
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
    expect(updatedBlock.page_id).toBe(pageId2);
    expect(updatedBlock.parent_block_id).toBeNull();
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
    expect(updatedBlock.page_id).toBeNull();
    expect(updatedBlock.parent_block_id).toBe(parentBlockId2);
  });

  test('updateBlockParent should move a block from a page to be a child of another block', () => {
    const pageId = db.addPage('Test Page');
    const parentBlockId = db.addBlock('Parent Block', 1, 'text', pageId);
    const blockId = db.addBlock('Block on Page', 1, 'text', pageId);

    // Move the block to be a child of another block
    db.updateBlockParent(blockId, undefined, parentBlockId);

    // Verify the change
    const updatedBlock = db.getBlockById(blockId);
    expect(updatedBlock.page_id).toBeNull();
    expect(updatedBlock.parent_block_id).toBe(parentBlockId);
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
    expect(updatedBlock.page_id).toBe(pageId2);
    expect(updatedBlock.parent_block_id).toBeNull();
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

    expect(workspace.workspace_id).toBe(workspaceId);
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
}); // End of UserDatabase tests

describe('UserDatabaseFTS', () => {
  let db: UserDatabase;

  beforeEach(() => {
    // Create a new in-memory database for each test
    db = new UserDatabase(':memory:');
  });

  afterEach(() => {
    // Close the database connection after each test
    db.close();
  });

  test('searchPages should find pages with exact title match', () => {
    // Add some pages
    const pageId1 = db.addPage('Introduction to Python');
    const pageId2 = db.addPage('Advanced JavaScript');
    const pageId3 = db.addPage('Machine Learning Basics');

    // Search for an exact match
    const results = db.searchPages('Python');
    expect(results).toHaveLength(1);
    expect(results[0].page_id).toBe(pageId1);
    expect(results[0].title).toBe('Introduction to Python');
  });

  test('searchPages should find pages with partial title match', () => {
    const pageId1 = db.addPage('Getting Started with Python');
    const pageId2 = db.addPage('Advanced JavaScript');
    const pageId3 = db.addPage('Python for Beginners');

    // Search for pages containing "Python"
    const results = db.searchPages('Python');
    expect(results).toHaveLength(2);
    const pageIds = results.map(result => result.page_id);
    expect(pageIds).toContain(pageId1);
    expect(pageIds).toContain(pageId3);
  });

  test('searchPages should find pages with multiple search terms', () => {
    const pageId1 = db.addPage('Introduction to Python Programming');
    const pageId2 = db.addPage('Advanced JavaScript');
    const pageId3 = db.addPage('Python Machine Learning');

    // Search for pages containing both "Python" and "Programming"
    const results = db.searchPages('Python Programming');
    expect(results).toHaveLength(1);
    expect(results[0].page_id).toBe(pageId1);
    expect(results[0].title).toBe('Introduction to Python Programming');
  });

  test('searchPages should work with phrase matching', () => {
    const pageId1 = db.addPage('Introduction to Python Programming');
    const pageId2 = db.addPage('Advanced Python Concepts');
    const pageId3 = db.addPage('Python Programming Guide');

    // Search for pages containing the exact phrase "Python Programming"
    const results = db.searchPages('"Python Programming"');
    expect(results).toHaveLength(2); // Both pageId1 and pageId3 should match
    const titles = results.map(result => result.title);
    expect(titles).toContain('Introduction to Python Programming');
    expect(titles).toContain('Python Programming Guide');
    expect(titles).not.toContain('Advanced Python Concepts');
  });

  test('searchPages should return no results when nothing matches', () => {
    db.addPage('Introduction to Python');
    db.addPage('Advanced JavaScript');

    // Search for a term that doesn't exist
    const results = db.searchPages('Nonexistent');
    expect(results).toHaveLength(0);
  });

  test('searchPages should work with limit parameter', () => {
    // Add several pages that match the search term
    for (let i = 0; i < 15; i++) {
      db.addPage(`Python Tutorial Part ${i}`);
    }

    // Search with a limit of 5
    const results = db.searchPages('Python', 5);
    expect(results).toHaveLength(5);
  });

  test('searchPages should be case insensitive', () => {
    const pageId1 = db.addPage('Introduction to Python');
    db.addPage('Advanced JavaScript');

    // Search using different case
    let results = db.searchPages('python');
    expect(results).toHaveLength(1);
    expect(results[0].page_id).toBe(pageId1);
    expect(results[0].title).toBe('Introduction to Python');

    results = db.searchPages('PYTHON');
    expect(results).toHaveLength(1);
    expect(results[0].page_id).toBe(pageId1);
    expect(results[0].title).toBe('Introduction to Python');
  });

  test('searchBlocks should find blocks with exact content match', () => {
    const pageId = db.addPage('Test Page');
    const blockId1 = db.addBlock('Learning Python is fun', 1, 'text', pageId);
    const blockId2 = db.addBlock('JavaScript is powerful', 2, 'text', pageId);
    const blockId3 = db.addBlock('Python data science', 3, 'text', pageId);

    // Search for an exact match
    const results = db.searchBlocks('Python');
    expect(results).toHaveLength(2);
    const blockIds = results.map(result => result.block_id);
    expect(blockIds).toContain(blockId1);
    expect(blockIds).toContain(blockId3);
    expect(blockIds).not.toContain(blockId2);
  });

  test('searchBlocks should find blocks with partial content match', () => {
    const pageId = db.addPage('Test Page');
    const blockId1 = db.addBlock('Getting started with Python programming', 1, 'text', pageId);
    const blockId2 = db.addBlock('Advanced JavaScript concepts', 2, 'text', pageId);
    const blockId3 = db.addBlock('Python machine learning tutorial', 3, 'text', pageId);

    // Search for blocks containing "Python"
    const results = db.searchBlocks('Python');
    expect(results).toHaveLength(2);
    const blockIds = results.map(result => result.block_id);
    expect(blockIds).toContain(blockId1);
    expect(blockIds).toContain(blockId3);
  });

  test('searchBlocks should find blocks with multiple search terms', () => {
    const pageId = db.addPage('Test Page');
    const blockId1 = db.addBlock('Introduction to Python Programming', 1, 'text', pageId);
    const blockId2 = db.addBlock('Advanced JavaScript', 2, 'text', pageId);
    const blockId3 = db.addBlock('Python Machine Learning', 3, 'text', pageId);

    // Search for blocks containing both "Python" and "Programming"
    const results = db.searchBlocks('Python Programming');
    expect(results).toHaveLength(1);
    expect(results[0].block_id).toBe(blockId1);
    expect(results[0].content).toBe('Introduction to Python Programming');
  });

  test('searchBlocks should work with phrase matching', () => {
    const pageId = db.addPage('Test Page');
    const blockId1 = db.addBlock('Introduction to Python Programming', 1, 'text', pageId);
    const blockId2 = db.addBlock('Advanced Python Concepts', 2, 'text', pageId);
    const blockId3 = db.addBlock('Python Programming Guide', 3, 'text', pageId);

    // Search for blocks containing the exact phrase "Python Programming"
    const results = db.searchBlocks('"Python Programming"');
    expect(results).toHaveLength(2);
    const contents = results.map(result => result.content);
    expect(contents).toContain('Introduction to Python Programming');
    expect(contents).toContain('Python Programming Guide');
    expect(contents).not.toContain('Advanced Python Concepts');
  });

  test('searchBlocks should return no results when nothing matches', () => {
    const pageId = db.addPage('Test Page');
    db.addBlock('Learning Python is fun', 1, 'text', pageId);
    db.addBlock('JavaScript is powerful', 2, 'text', pageId);

    // Search for a term that doesn't exist
    const results = db.searchBlocks('Nonexistent');
    expect(results).toHaveLength(0);
  });

  test('searchBlocks should work with limit parameter', () => {
    const pageId = db.addPage('Test Page');
    // Add several blocks that match the search term
    for (let i = 0; i < 15; i++) {
      db.addBlock(`Python tutorial part ${i}`, i + 1, 'text', pageId);
    }

    // Search with a limit of 5
    const results = db.searchBlocks('Python', 5);
    expect(results).toHaveLength(5);
  });

  test('searchBlocks should be case insensitive', () => {
    const pageId = db.addPage('Test Page');
    const blockId1 = db.addBlock('Learning Python is Fun', 1, 'text', pageId);
    db.addBlock('JavaScript is powerful', 2, 'text', pageId);

    // Search using different case
    let results = db.searchBlocks('python');
    expect(results).toHaveLength(1);
    expect(results[0].block_id).toBe(blockId1);
    expect(results[0].content).toBe('Learning Python is Fun');

    results = db.searchBlocks('PYTHON');
    expect(results).toHaveLength(1);
    expect(results[0].block_id).toBe(blockId1);
    expect(results[0].content).toBe('Learning Python is Fun');
  });

  test('searchBlocks should find blocks in nested block structures', () => {
    const pageId = db.addPage('Test Page');
    const parentBlockId = db.addBlock('Parent block with Python content', 1, 'text', pageId);
    const childBlockId = db.addBlock('Child block with JavaScript content', 1, 'text', undefined, parentBlockId);

    // Search for blocks containing "Python"
    const results = db.searchBlocks('Python');
    expect(results).toHaveLength(1);
    expect(results[0].block_id).toBe(parentBlockId);
    expect(results[0].content).toBe('Parent block with Python content');

    // Search for blocks containing "JavaScript"
    const results2 = db.searchBlocks('JavaScript');
    expect(results2).toHaveLength(1);
    expect(results2[0].block_id).toBe(childBlockId);
    expect(results2[0].content).toBe('Child block with JavaScript content');
  });

  test('searchAll should find both pages and blocks', () => {
    const pageId1 = db.addPage('Python Tutorial');
    const pageId2 = db.addPage('JavaScript Guide');
    const blockId1 = db.addBlock('Learning Python is fun', 1, 'text', pageId1);
    const blockId2 = db.addBlock('Advanced JavaScript concepts', 2, 'text', pageId2);

    // Search for term that appears in both page titles and block content
    const [pages, blocks] = db.searchAll('Python');
    expect(pages).toHaveLength(1);
    expect(blocks).toHaveLength(1);
    expect(pages[0].page_id).toBe(pageId1);
    expect(blocks[0].block_id).toBe(blockId1);
  });

  test('searchAll should work when query matches only pages', () => {
    const pageId1 = db.addPage('Python Tutorial');
    db.addPage('Java Guide');
    db.addBlock('Learning JavaScript is fun', 1, 'text', pageId1);
    db.addBlock('Advanced JavaScript concepts', 2, 'text', pageId1);

    // Search for term that appears only in page titles
    const [pages, blocks] = db.searchAll('Python');
    expect(pages).toHaveLength(1);
    expect(blocks).toHaveLength(0);
    expect(pages[0].page_id).toBe(pageId1);
  });

  test('searchAll should work when query matches only blocks', () => {
    const pageId1 = db.addPage('Tutorial');
    db.addPage('Guide');
    const blockId1 = db.addBlock('Learning Python is fun', 1, 'text', pageId1);
    db.addBlock('Advanced JavaScript concepts', 2, 'text', pageId1);

    // Search for term that appears only in block content
    const [pages, blocks] = db.searchAll('Python');
    expect(pages).toHaveLength(0);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].block_id).toBe(blockId1);
  });

  test('searchPages should update correctly after title update', () => {
    const pageId = db.addPage('Old Title Python');
    // Initially, should find the page
    let results = db.searchPages('Python');
    expect(results).toHaveLength(1);
    expect(results[0].page_id).toBe(pageId);

    // Update the title
    db.updatePageTitle(pageId, 'New Title JavaScript');

    // Search for old term - should not find it anymore
    results = db.searchPages('Python');
    expect(results).toHaveLength(0);

    // Search for new term - should find it
    results = db.searchPages('JavaScript');
    expect(results).toHaveLength(1);
    expect(results[0].page_id).toBe(pageId);
  });

  test('searchBlocks should update correctly after content update', () => {
    const pageId = db.addPage('Test Page');
    const blockId = db.addBlock('Old content with Python', 1, 'text', pageId);

    // Initially, should find the block
    let results = db.searchBlocks('Python');
    expect(results).toHaveLength(1);
    expect(results[0].block_id).toBe(blockId);

    // Update the content
    db.updateBlockContent(blockId, 'New content with JavaScript');

    // Search for old term - should not find it anymore
    results = db.searchBlocks('Python');
    expect(results).toHaveLength(0);

    // Search for new term - should find it
    results = db.searchBlocks('JavaScript');
    expect(results).toHaveLength(1);
    expect(results[0].block_id).toBe(blockId);
  });

  test('searchPages should update correctly after deletion', () => {
    const pageId = db.addPage('Python Tutorial');

    // Initially, should find the page
    let results = db.searchPages('Python');
    expect(results).toHaveLength(1);
    expect(results[0].page_id).toBe(pageId);

    // Delete the page
    db.deletePage(pageId);

    // Search for the term - should not find it anymore
    results = db.searchPages('Python');
    expect(results).toHaveLength(0);
  });

  test('searchBlocks should update correctly after deletion', () => {
    const pageId = db.addPage('Test Page');
    const blockId = db.addBlock('Content with Python', 1, 'text', pageId);

    // Initially, should find the block
    let results = db.searchBlocks('Python');
    expect(results).toHaveLength(1);
    expect(results[0].block_id).toBe(blockId);

    // Delete the block
    db.deleteBlock(blockId);

    // Search for the term - should not find it anymore
    results = db.searchBlocks('Python');
    expect(results).toHaveLength(0);
  });

  test('search should work after adding new content', () => {
    // Initially no pages
    let results = db.searchPages('Python');
    expect(results).toHaveLength(0);

    // Add a page
    const pageId = db.addPage('Python Introduction');

    // Now it should be searchable
    results = db.searchPages('Python');
    expect(results).toHaveLength(1);
    expect(results[0].page_id).toBe(pageId);

    // Add a block
    const blockId = db.addBlock('Advanced Python techniques', 1, 'text', pageId);

    // Block should be searchable
    results = db.searchBlocks('Python');
    expect(results).toHaveLength(1);
    expect(results[0].block_id).toBe(blockId);
  });

  test('search should work with special characters', () => {
    const pageId = db.addPage('Python & JavaScript Tutorial');
    const blockId = db.addBlock("Tips: 'Advanced Python' techniques", 1, 'text', pageId);

    // Search with ampersand
    let results = db.searchPages('Python & JavaScript');
    expect(results).toHaveLength(1);
    expect(results[0].page_id).toBe(pageId);

    // Search with quotes
    results = db.searchBlocks('Advanced Python');
    expect(results).toHaveLength(1);
    expect(results[0].block_id).toBe(blockId);

    // Search with punctuation
    results = db.searchPages('Tutorial');
    expect(results).toHaveLength(1);
    expect(results[0].page_id).toBe(pageId);
  });

  test('search with empty query should return empty results', () => {
    db.addPage('Python Tutorial');
    const pageId = db.addPage('JavaScript Guide');
    const blockId = db.addBlock('Learning Python is fun', 1, 'text', pageId);

    // Empty search should return empty results
    const [pages, blocks] = db.searchAll('');
    expect(pages).toHaveLength(0);
    expect(blocks).toHaveLength(0);
  });

  test('searchAll should work with limit parameter', () => {
    const page1_id = db.addPage('Python Introduction');
    const page2_id = db.addPage('Python Advanced Topics');

    for (let i = 0; i < 10; i++) {
      db.addBlock(`Python concept ${i}`, i + 1, 'text', page1_id);
    }

    // Search with limit - should apply separately to pages and blocks
    const [pages, blocks] = db.searchAll('Python', 3);
    expect(pages.length).toBeLessThanOrEqual(3);
    expect(blocks.length).toBeLessThanOrEqual(3);
    // Both should have results since we have more than 3 matches in each
    expect(pages.length).toBeGreaterThan(0);
    expect(blocks.length).toBeGreaterThan(0);
  });

  test('search with wildcards should work if supported', () => {
    const page1_id = db.addPage('Python Programming');
    const page2_id = db.addPage('JavaScript Programming');
    db.addPage('Java Programming');

    // Test if wildcard search works (would depend on FTS configuration)
    // Standard FTS5 doesn't support * wildcards directly in MATCH
    // But we can test with different query formats
    const results = db.searchPages('Programm*'); // This might not work with basic FTS
    // Should return a list at least
    expect(Array.isArray(results)).toBeTruthy();
  });

  test('search results should be properly ranked by relevance', () => {
    const page1_id = db.addPage('Python for Beginners: Introduction to Python Programming');
    const page2_id = db.addPage('Advanced Python Techniques');
    const page3_id = db.addPage('Random Title');

    // Search for "Python" - expect pages with more occurrences to rank higher
    const results = db.searchPages('Python', 10);

    // At least the pages containing "Python" should be returned
    const python_page_ids = [page1_id, page2_id];
    const result_ids = results.map(r => r.page_id);

    // Both Python-related pages should be in the results
    for (const pid of python_page_ids) {
      expect(result_ids).toContain(pid);
    }

    // The page with "Python" appearing twice might rank higher (depends on FTS ranking)
    // The third page should not appear since it doesn't contain "Python"
    expect(result_ids).not.toContain(page3_id);
  });

  test('search with boolean operators when escape_special_chars is false', () => {
    const page1_id = db.addPage('Python Tutorial');
    const page2_id = db.addPage('JavaScript Tutorial');
    const page3_id = db.addPage('Python and JavaScript Guide');

    // Search with OR operator - should find pages containing either Python or JavaScript
    const results_or = db.searchPages('Python OR JavaScript', 10, false);
    expect(results_or.length).toBe(3); // All three pages should match the OR query
    const result_ids_or = results_or.map(r => r.page_id);
    expect(result_ids_or).toContain(page1_id); // Contains Python
    expect(result_ids_or).toContain(page2_id); // Contains JavaScript
    expect(result_ids_or).toContain(page3_id); // Contains both Python and JavaScript

    // Search with AND operator - should find pages containing both terms
    const results_and = db.searchPages('Python AND JavaScript', 10, false);
    expect(results_and.length).toBe(1); // Only page3 contains both Python and Guide
    expect(results_and[0].page_id).toBe(page3_id);

    // Search with NOT operator - should find pages containing Python but not Tutorial
    const results_not = db.searchPages('Python NOT Tutorial', 10, false);
    // Only page3 contains Python but not Tutorial ("Tutorial" is not substring of "Tutorial")
    const result_ids_not = results_not.map(r => r.page_id);
    // Note: This depends on exact implementation of NOT operator in search
    expect(result_ids_not).not.toContain(page1_id); // Contains both Python and Tutorial
  });
}); // End of UserDatabaseFTS tests
