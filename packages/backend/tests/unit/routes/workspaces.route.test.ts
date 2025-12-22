import { beforeEach, afterEach, describe, expect, test, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { app } from '../../../src/app'; // Adjust this import path as needed
import { SystemDatabase } from '../../../src/database/system';
import { UserDatabase } from '../../../src/database/user';
import { UserDatabaseInfo } from '../../../src/database/entities';
import { setupTestSystemDatabase, teardownTestSystemDatabase, DbTestSetup } from '../test-utils/db-test-setup';



describe('Workspace API Routes', () => {
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

  test('should add a workspace successfully', async () => {
    const response = await request(app)
      .post(`/db/${testDatabaseId}/workspaces`)
      .send({
        name: 'Test Workspace',
        color: '#ff0000'
      })
      .expect(200);

    const response_data = response.body;
    const workspace_id = response_data.workspace_id;
    expect(typeof workspace_id).toBe('number'); // Workspace ID should be an integer

    // Verify the workspace exists in the database
    const workspace_data = testDb.getWorkspaceById(Number(workspace_id));
    expect(workspace_data).toBeDefined();
    expect(workspace_data?.name).toBe('Test Workspace');
    expect(workspace_data?.color).toBe('#ff0000');
  });

  test('should add a workspace with special characters', async () => {
    const response = await request(app)
      .post(`/db/${testDatabaseId}/workspaces`)
      .send({
        name: 'Workspace & Test!',
        color: '#00aaff'
      })
      .expect(200);

    const response_data = response.body;
    const workspace_id = response_data.workspace_id;

    expect(typeof workspace_id).toBe('number');

    // Verify the workspace exists in the database
    const workspace_data = testDb.getWorkspaceById(Number(workspace_id));
    expect(workspace_data).toBeDefined();
    expect(workspace_data?.name).toBe('Workspace & Test!');
    expect(workspace_data?.color).toBe('#00aaff');
  });

  test('should get a workspace by ID successfully', async () => {
    // Create a workspace first
    const workspace_id = testDb.addWorkspace('Test Workspace', '#ff0000');

    const response = await request(app)
      .get(`/db/${testDatabaseId}/workspaces/${workspace_id}`)
      .expect(200);

    const response_data = response.body;
    expect(response_data.workspace_id).toBe(workspace_id);
    expect(response_data.name).toBe('Test Workspace');
    expect(response_data.color).toBe('#ff0000');
  });

  test('should return 404 when getting a non-existent workspace', async () => {
    const response = await request(app)
      .get(`/db/${testDatabaseId}/workspaces/999999`) // Use a large number unlikely to exist
      .expect(404);

    expect(response.body).toEqual({ error: 'Workspace with ID 999999 not found' });
  });

  test('should get all workspaces successfully', async () => {
    // Create some workspaces
    const workspace1_id = testDb.addWorkspace('Workspace 1', '#ff0000');
    const workspace2_id = testDb.addWorkspace('Workspace 2', '#00ff00');
    const workspace3_id = testDb.addWorkspace('Workspace 3', '#0000ff');

    const response = await request(app)
      .get(`/db/${testDatabaseId}/workspaces`)
      .expect(200);

    const workspaces = response.body;

    // Check that the default workspace and our created ones are present
    const workspace_ids = workspaces.map((ws: any) => ws.workspace_id);
    expect(workspace_ids).toContain(workspace1_id);
    expect(workspace_ids).toContain(workspace2_id);
    expect(workspace_ids).toContain(workspace3_id);

    // Verify workspace details
    for (const ws of workspaces) {
      if (ws.workspace_id === workspace1_id) {
        expect(ws.name).toBe('Workspace 1');
        expect(ws.color).toBe('#ff0000');
      } else if (ws.workspace_id === workspace2_id) {
        expect(ws.name).toBe('Workspace 2');
        expect(ws.color).toBe('#00ff00');
      } else if (ws.workspace_id === workspace3_id) {
        expect(ws.name).toBe('Workspace 3');
        expect(ws.color).toBe('#0000ff');
      }
    }
  });

  test('should update a workspace successfully', async () => {
    // Create a workspace first
    const workspace_id = testDb.addWorkspace('Old Workspace', '#ff0000');

    const response = await request(app)
      .put(`/db/${testDatabaseId}/workspaces`)
      .send({
        workspace_id: workspace_id,
        new_name: 'Updated Workspace',
        new_color: '#ffffff'
      })
      .expect(200);

    expect(response.body).toEqual({ status: 'success' });

    // Verify the workspace was updated in the database
    const workspace_data = testDb.getWorkspaceById(Number(workspace_id));
    expect(workspace_data).toBeDefined();
    expect(workspace_data?.name).toBe('Updated Workspace');
    expect(workspace_data?.color).toBe('#ffffff');
  });

  test('should return 404 when updating a non-existent workspace', async () => {
    const response = await request(app)
      .put(`/db/${testDatabaseId}/workspaces`)
      .send({
        workspace_id: 999999, // Use a large number unlikely to exist
        new_name: 'Updated Workspace',
        new_color: '#ffffff'
      })
      .expect(404);

    expect(response.body).toEqual({ error: 'Workspace with ID 999999 not found' });
  });

  test('should update a workspace with special characters', async () => {
    // Create a workspace first
    const workspace_id = testDb.addWorkspace('Test Workspace', '#ff0000');

    const response = await request(app)
      .put(`/db/${testDatabaseId}/workspaces`)
      .send({
        workspace_id: workspace_id,
        new_name: 'Updated Workspace & Test!',
        new_color: '#123ABC'
      })
      .expect(200);

    expect(response.body).toEqual({ status: 'success' });

    // Verify the workspace was updated in the database
    const workspace_data = testDb.getWorkspaceById(Number(workspace_id));
    expect(workspace_data).toBeDefined();
    expect(workspace_data?.name).toBe('Updated Workspace & Test!');
    expect(workspace_data?.color).toBe('#123abc');
  });

  test('should delete a workspace successfully', async () => {
    // Create a workspace first
    const workspace_id = testDb.addWorkspace('Test Workspace', '#ff0000');

    const response = await request(app)
      .delete(`/db/${testDatabaseId}/workspaces/${workspace_id}`)
      .expect(200);

    expect(response.body).toEqual({ status: 'success' });

    // Verify the workspace was deleted from the database
    try {
      testDb.getWorkspaceById(Number(workspace_id));
      // If we reach this line, the workspace wasn't deleted
      expect(true).toBe(false); // This should not happen
    } catch (error) {
      // Expected - workspace should not be found
      expect(error).toBeDefined();
    }
  });

  test('should return 404 when deleting a non-existent workspace', async () => {
    const response = await request(app)
      .delete(`/db/${testDatabaseId}/workspaces/999999`) // Use a large number unlikely to exist
      .expect(404);

    expect(response.body).toEqual({ error: 'Workspace with ID 999999 not found' });
  });

  test('should add a workspace with a very long name', async () => {
    const long_name = 'A'.repeat(500);

    const response = await request(app)
      .post(`/db/${testDatabaseId}/workspaces`)
      .send({
        name: long_name,
        color: '#abcdef'
      })
      .expect(200);

    const response_data = response.body;
    const workspace_id = response_data.workspace_id;
    expect(typeof workspace_id).toBe('number'); // Workspace ID should be an integer

    // Verify the workspace exists in the database
    const workspace_data = testDb.getWorkspaceById(Number(workspace_id));
    expect(workspace_data).toBeDefined();
    expect(workspace_data?.name).toBe(long_name);
    expect(workspace_data?.color).toBe('#abcdef');
  });

  test('should get all workspaces when there are no additional workspaces (only default)', async () => {
    const response = await request(app)
      .get(`/db/${testDatabaseId}/workspaces`)
      .expect(200);

    const workspaces = response.body;
    // At least the default workspace should exist
    expect(workspaces.length).toBeGreaterThanOrEqual(1);
  });
});
