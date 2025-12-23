import { beforeEach, afterEach, describe, expect, test, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { app } from '../../../src/app'; // Adjust this import path as needed
import { SystemDatabase } from '../../../src/database/system';
import { UserDatabase } from '../../../src/database/user';
import { setupTestSystemDatabase, teardownTestSystemDatabase, DbTestSetup } from '../test-utils/db-test-setup';

describe('Page API Routes', () => {
  let sysDb: SystemDatabase;
  let testSetup: DbTestSetup;
  let testDb: UserDatabase;
  let testDatabaseId: string;
  let testDbNum = 0;

  beforeAll(() => {
    // Initialize system database
    testSetup = setupTestSystemDatabase();
    sysDb = testSetup.sysDb;
  })

  beforeEach(() => {
    // Add the test database and capture its ID
    let userDbName = `test_db_${testDbNum}`;
    testDbNum += 1;
    sysDb.addUserDatabase(userDbName);
    const dbInfo = sysDb.getUserDatabaseByName(userDbName);
    if (dbInfo) {
      testDatabaseId = dbInfo.id;
    }

    // Create user database
    testDb = new UserDatabase(dbInfo.path);
  });

  afterEach(async () => {
    testDb.close();

    // Delete the test database from system DB
    if (testDatabaseId) {
      const dbInfo = sysDb.getUserDatabaseById(testDatabaseId);
      await sysDb.deleteUserDatabase(testDatabaseId);
    }

  });

  afterAll(() => {
    teardownTestSystemDatabase(testSetup);
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
  test('should not add a page with an empty title', async () => {
    const response = await request(app)
      .post(`/db/${testDatabaseId}/pages`)
      .send({ title: '' })
      .expect(400);
  });

  test('should get all pages when there are no pages', async () => {
    const response = await request(app)
      .get(`/db/${testDatabaseId}/pages`)
      .expect(200);

    expect(response.body).toEqual([]);
  });
});
