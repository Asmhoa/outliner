import { beforeEach, afterEach, describe, expect, test, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { app } from '../../../src/app'; // Adjust this import path as needed
import { SystemDatabase } from '../../../src/database/system';
import { UserDatabase } from '../../../src/database/user';
import { setupTestSystemDatabase, teardownTestSystemDatabase, DbTestSetup } from '../../test-utils/db-test-setup';

describe('Search API Routes', () => {
  let sysDb: SystemDatabase;
  let testSetup: DbTestSetup;
  let testDb: UserDatabase;
  let testDatabaseId: string;

  beforeAll(() => {
    // Initialize system database
    testSetup = setupTestSystemDatabase();
    sysDb = testSetup.sysDb;
  });

  beforeEach(() => {
    // Add the test database and capture its ID
    sysDb.addUserDatabase('test_search_db');
    const dbInfo = sysDb.getUserDatabaseByName('test_search_db');
    if (dbInfo) {
      testDatabaseId = dbInfo.id;
    }

    // Create user database
    testDb = new UserDatabase(dbInfo.path);
    testDb.initializeTables();

    // Create some test data for search
    // Create test pages
    const page1 = testDb.addPage("Python Programming");
    const page2 = testDb.addPage("JavaScript Tutorial");
    const page3 = testDb.addPage("Machine Learning Basics");

    // Add blocks to pages
    testDb.addBlock("Learning Python is fun and powerful", 0, { page_id: page1 });
    testDb.addBlock("JavaScript enables interactive web pages", 0, { page_id: page2 });
    testDb.addBlock("Machine Learning uses algorithms and statistical models", 0, { page_id: page3 });
    testDb.addBlock("Python has great libraries for data science", 1, { page_id: page1 });
  });

  afterEach(() => {
    testDb.close();

    // Delete the test database from system DB
    if (testDatabaseId) {
      const dbInfo = sysDb.getUserDatabaseById(testDatabaseId);
      if (fs.existsSync(dbInfo.path)) {
        fs.unlinkSync(dbInfo.path);
      }
      sysDb.deleteUserDatabase(testDatabaseId);
    }
  });

  afterAll(() => {
    teardownTestSystemDatabase(testSetup);
  });

  test('should search pages endpoint successfully', async () => {
    const searchRequest = {
      query: "Python",
      search_type: "pages",
      limit: 10
    };

    const response = await request(app)
      .post(`/db/${testDatabaseId}/search`)
      .send(searchRequest)
      .expect(200);

    const data = response.body;
    expect(data.pages).toBeDefined();
    expect(data.blocks).toBeDefined();
    expect(data.blocks).toHaveLength(0); // Since we searched for pages only

    const pages = data.pages;
    expect(Array.isArray(pages)).toBe(true);
    expect(pages.length).toBeGreaterThanOrEqual(1);

    // Check that the Python Programming page is found
    const foundPythonPage = pages.some((page: any) => page.title.includes("Python Programming"));
    expect(foundPythonPage).toBe(true);
  });

  test('should search blocks endpoint successfully', async () => {
    const searchRequest = {
      query: "JavaScript",
      search_type: "blocks",
      limit: 10
    };

    const response = await request(app)
      .post(`/db/${testDatabaseId}/search`)
      .send(searchRequest)
      .expect(200);

    const data = response.body;
    expect(data.pages).toBeDefined();
    expect(data.blocks).toBeDefined();
    expect(data.pages).toHaveLength(0); // Since we searched for blocks only

    const blocks = data.blocks;
    expect(Array.isArray(blocks)).toBe(true);
    expect(blocks.length).toBeGreaterThanOrEqual(1);

    // Check that the JavaScript block is found
    const foundJavaScriptBlock = blocks.some((block: any) => block.content.includes("JavaScript"));
    expect(foundJavaScriptBlock).toBe(true);
  });

  test('should search all endpoint successfully', async () => {
    const searchRequest = {
      query: "Python",
      search_type: "all",
      limit: 10
    };

    const response = await request(app)
      .post(`/db/${testDatabaseId}/search`)
      .send(searchRequest)
      .expect(200);

    const data = response.body;
    expect(data.pages).toBeDefined();
    expect(data.blocks).toBeDefined();

    // Should have both pages and blocks containing "Python"
    const pages = data.pages;
    const blocks = data.blocks;

    expect(pages.length).toBeGreaterThanOrEqual(1);
    expect(blocks.length).toBeGreaterThanOrEqual(1);

    // Check that Python page is found
    const foundPythonPage = pages.some((page: any) => page.title.includes("Python"));
    expect(foundPythonPage).toBe(true);

    // Check that Python block is found
    const foundPythonBlock = blocks.some((block: any) => block.content.includes("Python"));
    expect(foundPythonBlock).toBe(true);
  });

  test('should search with limit successfully', async () => {
    // First, add more test data to have enough results
    for (let i = 0; i < 5; i++) {
      const newPageId = testDb.addPage(`Test Page ${i} Python`);
      testDb.addBlock(`Test block content ${i} with Python`, 0, { page_id: newPageId });
    }

    const searchRequest = {
      query: "Python",
      search_type: "all",
      limit: 3
    };

    const response = await request(app)
      .post(`/db/${testDatabaseId}/search`)
      .send(searchRequest)
      .expect(200);

    const data = response.body;
    const pages = data.pages;
    const blocks = data.blocks;

    // The limit should apply to each type separately in our implementation
    expect(pages.length).toBeLessThanOrEqual(3);
    expect(blocks.length).toBeLessThanOrEqual(3);
  });

  test('should return no results when search finds nothing', async () => {
    const searchRequest = {
      query: "NonExistentSearchTerm",
      search_type: "all",
      limit: 10
    };

    const response = await request(app)
      .post(`/db/${testDatabaseId}/search`)
      .send(searchRequest)
      .expect(200);

    const data = response.body;
    expect(data.pages).toBeDefined();
    expect(data.blocks).toBeDefined();
    expect(data.pages).toHaveLength(0);
    expect(data.blocks).toHaveLength(0);
  });

  test('should return 400 when using invalid search type', async () => {
    const searchRequest = {
      query: "Python",
      search_type: "invalid_type",
      limit: 10
    };

    const response = await request(app)
      .post(`/db/${testDatabaseId}/search`)
      .send(searchRequest)
      .expect(400);

    expect(response.body).toEqual({ error: "Invalid search_type. Must be 'pages', 'blocks', or 'all'" });
  });

  test('should return 400 when missing query parameter', async () => {
    const searchRequest = {
      search_type: "all",
      limit: 10
    };

    const response = await request(app)
      .post(`/db/${testDatabaseId}/search`)
      .send(searchRequest)
      .expect(400);

    expect(response.body).toEqual({ error: 'Query is required' });
  });

  test('should work with default values', async () => {
    const searchRequest = {
      query: "Python"
      // search_type defaults to "all", limit defaults to 10
    };

    const response = await request(app)
      .post(`/db/${testDatabaseId}/search`)
      .send(searchRequest)
      .expect(200);

    const data = response.body;
    expect(data.pages).toBeDefined();
    expect(data.blocks).toBeDefined();
    // Should return both pages and blocks (default search_type="all")
  });

  test('should work with advanced mode enabled', async () => {
    const searchRequest = {
      query: "Python OR JavaScript",
      search_type: "all",
      limit: 10,
      advanced: true // Should not escape special characters, allowing boolean operators
    };

    const response = await request(app)
      .post(`/db/${testDatabaseId}/search`)
      .send(searchRequest)
      .expect(200);

    const data = response.body;
    expect(data.pages).toBeDefined();
    expect(data.blocks).toBeDefined();

    // In advanced mode, search should handle boolean operators if supported by FTS
    // We expect to find content related to either Python or JavaScript
  });

  test('should search multiple words successfully', async () => {
    const searchRequest = {
      query: "Machine Learning",
      search_type: "all",
      limit: 10
    };

    const response = await request(app)
      .post(`/db/${testDatabaseId}/search`)
      .send(searchRequest)
      .expect(200);

    const data = response.body;
    expect(data.pages).toBeDefined();
    expect(data.blocks).toBeDefined();

    // Should find pages/blocks containing both words or phrases
    let foundMLContent = false;
    for (const page of data.pages) {
      if (page.title.includes("Machine Learning")) {
        foundMLContent = true;
        break;
      }
    }

    if (!foundMLContent) {
      for (const block of data.blocks) {
        if (block.content.includes("Machine Learning")) {
          foundMLContent = true;
          break;
        }
      }
    }

    expect(foundMLContent).toBe(true);
  });

  test('should search phrase match successfully', async () => {
    const searchRequest = {
      query: '"Python is fun"',
      search_type: "blocks",
      limit: 10
    };

    const response = await request(app)
      .post(`/db/${testDatabaseId}/search`)
      .send(searchRequest)
      .expect(200);

    const data = response.body;
    expect(data.pages).toBeDefined();
    expect(data.blocks).toBeDefined();

    // Should find blocks containing the exact phrase
    let foundPhrase = false;
    for (const block of data.blocks) {
      if (block.content.includes("Python is fun")) {
        foundPhrase = true;
        break;
      }
    }

    expect(foundPhrase).toBe(true);
  });

  test('should return 404 when searching non-existent database', async () => {
    const searchRequest = {
      query: "test",
      search_type: "all",
      limit: 10
    };

    const response = await request(app)
      .post('/db/invalid-db-id/search')
      .send(searchRequest)
      .expect(404);

    expect(response.body.error).toContain('not found');
  });
});