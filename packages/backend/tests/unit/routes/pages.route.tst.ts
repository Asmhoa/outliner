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

describe('Page API Routes', () => {
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

  test('should add a page successfully', async () => {
    const response = await request(app)
      .post(`/db/${testDatabaseId}/pages`)
      .send({ title: 'Test Page' })
      .expect(200);

    const { page_id } = response.body;
    expect(page_id).toBeDefined();
    expect(typeof page_id).toBe('string');
    expect(page_id.length).toBeGreaterThan(0);

    // Verify the page exists in the database
    const pageData = testDb.getPageById(page_id);
    expect(pageData).toBeDefined();
    expect(pageData?.title).toBe('Test Page');
  });

  test('should get a page by ID successfully', async () => {
    // Create a page first
    const pageId = testDb.addPage('Test Page');

    const response = await request(app)
      .get(`/db/${testDatabaseId}/pages/${pageId}`)
      .expect(200);

    const responseData = response.body;
    expect(responseData.page_id).toBe(pageId);
    expect(responseData.title).toBe('Test Page');
    expect(responseData.created_at).toBeDefined();
  });

  test('should return 404 when getting a non-existent page', async () => {
    const response = await request(app)
      .get(`/db/${testDatabaseId}/pages/xyz999`)
      .expect(404);

    expect(response.body).toEqual({ error: 'Page with ID xyz999 not found' });
  });

  test('should get all pages successfully', async () => {
    // Create some pages
    const pageId1 = testDb.addPage('Page 1');
    const pageId2 = testDb.addPage('Page 2');

    const response = await request(app)
      .get(`/db/${testDatabaseId}/pages`)
      .expect(200);

    const pages = response.body;
    expect(Array.isArray(pages)).toBe(true);
    expect(pages).toHaveLength(2);

    const pageIds = pages.map((page: any) => page.page_id);
    expect(pageIds).toContain(pageId1);
    expect(pageIds).toContain(pageId2);

    const titles = pages.map((page: any) => page.title);
    expect(titles).toContain('Page 1');
    expect(titles).toContain('Page 2');
  });

  test('should rename a page successfully', async () => {
    // Create a page first
    const pageId = testDb.addPage('Old Title');

    const response = await request(app)
      .put(`/db/${testDatabaseId}/pages`)
      .send({
        page_id: pageId,
        new_title: 'New Title'
      })
      .expect(200);

    expect(response.body).toEqual({ status: 'success' });

    // Verify the page was renamed in the database
    const pageData = testDb.getPageById(pageId);
    expect(pageData).toBeDefined();
    expect(pageData?.title).toBe('New Title');
  });

  test('should return 404 when renaming a non-existent page', async () => {
    const response = await request(app)
      .put(`/db/${testDatabaseId}/pages`)
      .send({
        page_id: 'xyz999',
        new_title: 'New Title'
      })
      .expect(404);

    expect(response.body.error).toContain('Page with ID xyz999 not found');
  });

  test('should delete a page successfully', async () => {
    // Create a page first
    const pageId = testDb.addPage('Test Page');

    const response = await request(app)
      .delete(`/db/${testDatabaseId}/pages/${pageId}`)
      .expect(200);

    expect(response.body).toEqual({ status: 'success' });

    // Verify the page was deleted from the database
    try {
      testDb.getPageById(pageId);
      // If we reach this line, the page wasn't deleted
      expect(true).toBe(false); // This should not happen
    } catch (error) {
      // Expected - page should not be found
      expect(error).toBeDefined();
    }
  });

  test('should return 404 when deleting a non-existent page', async () => {
    const response = await request(app)
      .delete(`/db/${testDatabaseId}/pages/xyz999`)
      .expect(404);

    expect(response.body).toEqual({ error: 'Page with ID xyz999 not found' });
  });

  // Additional edge case tests for pages
  test('should add a page with an empty title', async () => {
    const response = await request(app)
      .post(`/db/${testDatabaseId}/pages`)
      .send({ title: '' })
      .expect(200);

    const { page_id } = response.body;
    expect(page_id).toBeDefined();
    expect(typeof page_id).toBe('string');
    expect(page_id.length).toBeGreaterThan(0);

    // Verify the page exists in the database with empty title
    const pageData = testDb.getPageById(page_id);
    expect(pageData).toBeDefined();
    expect(pageData?.title).toBe('');
  });

  test('should get all pages when there are no pages', async () => {
    const response = await request(app)
      .get(`/db/${testDatabaseId}/pages`)
      .expect(200);

    expect(response.body).toEqual([]);
  });
});