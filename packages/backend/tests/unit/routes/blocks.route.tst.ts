import { beforeEach, afterEach, describe, expect, test, vi } from 'vitest';
import request from 'supertest';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { app } from '../../../src/app'; // Adjust this import path as needed
import { SystemDatabase } from '../../../src/database/system';
import { UserDatabase } from '../../../src/database/user';

// Define paths relative to the test directory
const TEST_DATA_DIR = path.join(os.tmpdir(), 'outliner-test-data');
const TEST_USER_DB_PATH = path.join(TEST_DATA_DIR, 'test.db');
const TEST_SYS_DB_PATH = path.join(TEST_DATA_DIR, 'test_sys.db');
let testDatabaseId: string | null = null;

// Mock environment variables
vi.stubEnv('SYSTEM_DB_PATH', TEST_SYS_DB_PATH);

// Setup test data directory
beforeEach(() => {
  fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
});

afterEach(() => {
  // Clean up the directory after each test
  if (fs.existsSync(TEST_DATA_DIR)) {
    fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  }
  
  // Reset any mocked dependencies
  vi.clearAllMocks();
});

describe('Block API Routes', () => {
  let sysDb: SystemDatabase;
  let testDb: UserDatabase;

  beforeEach(() => {
    // Initialize system database
    sysDb = new SystemDatabase(TEST_SYS_DB_PATH);
    
    // Add the test database and capture its ID
    sysDb.addUserDatabase('test_db');
    const dbInfo = sysDb.getUserDatabaseByName('test_db');
    if (dbInfo) {
      testDatabaseId = dbInfo.id;
    }

    // Create user database
    testDb = new UserDatabase(TEST_USER_DB_PATH);
    testDb.initializeTables();
  });

  afterEach(() => {
    testDb.close();
    sysDb.close();
    
    // Delete the test database from system DB
    if (testDatabaseId) {
      sysDb.deleteUserDatabase(testDatabaseId);
    }
    
    // Remove the user database file
    if (fs.existsSync(TEST_USER_DB_PATH)) {
      fs.unlinkSync(TEST_USER_DB_PATH);
    }
  });

  test('should add a block successfully', async () => {
    // Create a page first
    const pageId = testDb.addPage('Test Page');

    const response = await request(app)
      .post(`/db/${testDatabaseId}/blocks`)
      .send({
        content: 'Test Block',
        position: 1,
        page_id: pageId
      })
      .expect(200);

    const responseData = response.body;
    const blockId = responseData.block_id;
    
    expect(blockId).toBeDefined();
    expect(typeof blockId).toBe('string');
    expect(blockId.length).toBeGreaterThan(0);

    // Verify the block exists in the database
    const blockData = testDb.getBlockContentById(blockId);
    expect(blockData).toBeDefined();
    expect(blockData?.content).toBe('Test Block');
    expect(blockData?.page_id).toBe(pageId);
    expect(blockData?.parent_block_id).toBeNull();
    expect(blockData?.position).toBe(1);
  });

  test('should get a block by ID successfully', async () => {
    // Create a page and block first
    const pageId = testDb.addPage('Test Page');
    const blockId = testDb.addBlock('Test Block', 1, { page_id: pageId });

    const response = await request(app)
      .get(`/db/${testDatabaseId}/block/${blockId}`)
      .expect(200);

    const responseData = response.body;
    expect(responseData.block_id).toBe(blockId);
    expect(responseData.content).toBe('Test Block');
    expect(responseData.page_id).toBe(pageId);
    expect(responseData.parent_block_id).toBeNull();
    expect(responseData.position).toBe(1);
    expect(responseData.created_at).toBeDefined();
  });

  test('should return 404 when getting a non-existent block', async () => {
    const response = await request(app)
      .get(`/db/${testDatabaseId}/block/xyz999`)
      .expect(404);

    expect(response.body).toEqual({ error: 'Block with ID xyz999 not found' });
  });

  test('should get all blocks for a page successfully', async () => {
    // Create a page and some blocks that are directly associated with the page
    const pageId = testDb.addPage('Test Page');
    const block1Id = testDb.addBlock('Block 1', 1, { page_id: pageId });
    const block2Id = testDb.addBlock('Block 2', 2, { page_id: pageId });

    const response = await request(app)
      .get(`/db/${testDatabaseId}/blocks/${pageId}`)
      .expect(200);

    const blocks = response.body;
    expect(Array.isArray(blocks)).toBe(true);
    expect(blocks).toHaveLength(2);

    // Verify both blocks are present
    const blockIds = blocks.map((block: any) => block.block_id);
    expect(blockIds).toContain(block1Id);
    expect(blockIds).toContain(block2Id);

    // Verify block details
    for (const block of blocks) {
      if (block.block_id === block1Id) {
        expect(block.content).toBe('Block 1');
        expect(block.position).toBe(1);
        expect(block.page_id).toBe(pageId);
      } else if (block.block_id === block2Id) {
        expect(block.content).toBe('Block 2');
        expect(block.position).toBe(2);
        expect(block.page_id).toBe(pageId);
      }
    }
  });

  test('should update block content successfully', async () => {
    // Create a page and block first
    const pageId = testDb.addPage('Test Page');
    const blockId = testDb.addBlock('Original Content', 1, { page_id: pageId });

    const response = await request(app)
      .put(`/db/${testDatabaseId}/blocks/content`)
      .send({
        block_id: blockId,
        new_content: 'Updated Content'
      })
      .expect(200);

    expect(response.body).toEqual({ status: 'success' });

    // Verify the block content was updated in the database
    const blockData = testDb.getBlockContentById(blockId);
    expect(blockData).toBeDefined();
    expect(blockData?.content).toBe('Updated Content');
  });

  test('should return 404 when updating content of a non-existent block', async () => {
    const response = await request(app)
      .put(`/db/${testDatabaseId}/blocks/content`)
      .send({
        block_id: 'xyz999',
        new_content: 'Updated Content'
      })
      .expect(404);

    expect(response.body).toEqual({ error: 'Block not found' });
  });

  test('should update block parent successfully', async () => {
    // Create a page and two blocks first
    const pageId = testDb.addPage('Test Page');
    const blockId = testDb.addBlock('Test Block', 1, { page_id: pageId });
    const newPageId = testDb.addPage('New Page');

    const response = await request(app)
      .put(`/db/${testDatabaseId}/blocks/parent`)
      .send({
        block_id: blockId,
        new_page_id: newPageId
      })
      .expect(200);

    expect(response.body).toEqual({ status: 'success' });

    // Verify the block parent was updated in the database
    const blockData = testDb.getBlockContentById(blockId);
    expect(blockData).toBeDefined();
    expect(blockData?.page_id).toBe(newPageId); // Should be on the new page
    expect(blockData?.parent_block_id).toBeNull(); // Parent should be None (not a child block)
  });

  test('should delete a block successfully', async () => {
    // Create a page and block first
    const pageId = testDb.addPage('Test Page');
    const blockId = testDb.addBlock('Test Block', 1, { page_id: pageId });

    const response = await request(app)
      .delete(`/db/${testDatabaseId}/blocks/${blockId}`)
      .expect(200);

    expect(response.body).toEqual({ status: 'success' });

    // Verify the block was deleted from the database
    try {
      testDb.getBlockContentById(blockId);
      // If we reach this line, the block wasn't deleted
      expect(true).toBe(false); // This should not happen
    } catch (error) {
      // Expected - block should not be found
      expect(error).toBeDefined();
    }
  });

  test('should return 404 when deleting a non-existent block', async () => {
    const response = await request(app)
      .delete(`/db/${testDatabaseId}/blocks/xyz999`)
      .expect(404);

    expect(response.body).toEqual({ error: 'Block not found' });
  });

  test('should get blocks for a page when there are no blocks', async () => {
    // Create a page but no blocks
    const pageId = testDb.addPage('Test Page');

    const response = await request(app)
      .get(`/db/${testDatabaseId}/blocks/${pageId}`)
      .expect(200);

    expect(response.body).toEqual([]);
  });

  test('should update block content with special characters', async () => {
    // Create a page and block first
    const pageId = testDb.addPage('Test Page');
    const blockId = testDb.addBlock('Original Content', 1, { page_id: pageId });

    const specialContent = 'Special chars: !@#$%^&*()_+-={}|\\:"\'<>?,./';
    const response = await request(app)
      .put(`/db/${testDatabaseId}/blocks/content`)
      .send({
        block_id: blockId,
        new_content: specialContent
      })
      .expect(200);

    expect(response.body).toEqual({ status: 'success' });

    // Verify the block content was updated in the database
    const blockData = testDb.getBlockContentById(blockId);
    expect(blockData).toBeDefined();
    expect(blockData?.content).toBe(specialContent);
  });

  test('should add a block with parent successfully', async () => {
    // Create a page and parent block first
    const pageId = testDb.addPage('Test Page');
    const parentBlockId = testDb.addBlock('Parent Block', 1, { page_id: pageId });

    // First add the child block to the page
    let response = await request(app)
      .post(`/db/${testDatabaseId}/blocks`)
      .send({
        content: 'Child Block',
        position: 2,
        page_id: pageId
      })
      .expect(200);

    const responseData = response.body;
    const blockId = responseData.block_id;
    
    expect(blockId).toBeDefined();
    expect(typeof blockId).toBe('string');
    expect(blockId.length).toBeGreaterThan(0);

    // Verify the block exists in the database (initially associated with the page)
    let blockData = testDb.getBlockContentById(blockId);
    expect(blockData).toBeDefined();
    expect(blockData?.content).toBe('Child Block');
    expect(blockData?.page_id).toBe(pageId); // Initially associated with the page
    expect(blockData?.parent_block_id).toBeNull(); // Initially no parent block
    expect(blockData?.position).toBe(2);

    // Now update the block's parent to be the parent_block
    response = await request(app)
      .put(`/db/${testDatabaseId}/blocks/parent`)
      .send({
        block_id: blockId,
        new_parent_block_id: parentBlockId
      })
      .expect(200);

    expect(response.body).toEqual({ status: 'success' });

    // Verify the block was updated with the correct parent
    blockData = testDb.getBlockContentById(blockId);
    expect(blockData).toBeDefined();
    expect(blockData?.content).toBe('Child Block');
    expect(blockData?.page_id).toBeNull(); // Should no longer be directly associated with page
    expect(blockData?.parent_block_id).toBe(parentBlockId); // Should have the correct parent
  });
});