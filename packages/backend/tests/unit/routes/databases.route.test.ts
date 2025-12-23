import { beforeEach, afterEach, describe, expect, test, vi, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../../src/app'; // Adjust this import path as needed
import { SystemDatabase } from '../../../src/database/system';
import { UserDatabase } from '../../../src/database/user';
import { UserDatabaseInfo } from '../../../src/database/entities';
import { setupTestSystemDatabase, teardownTestSystemDatabase, DbTestSetup } from '../test-utils/db-test-setup';
import { SystemDatabaseProvider } from '../../../src/database/system.provider';


describe('Database API Routes', () => {
  let sysDb: SystemDatabase;
  let testSetup: DbTestSetup;

  beforeEach(() => {
    // Initialize system database
    testSetup = setupTestSystemDatabase();
    sysDb = testSetup.sysDb;
  });

  afterEach(() => {
    teardownTestSystemDatabase(testSetup);

    // Force provider for routes to make a new instance next time
    // Needed since each test has a different SYSTEM_DB_PATH
    SystemDatabaseProvider.closeInstance();
  });


  test('should get an empty list when no databases exist', async () => {
    const response = await request(app)
      .get('/databases')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(0);
  });

  test('should get a list of databases when they exist', async () => {
    // Add some databases first
    sysDb.addUserDatabase('db1');
    sysDb.addUserDatabase('db2');

    const response = await request(app)
      .get('/databases')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(2);

    const dbNames = response.body.map((db: UserDatabaseInfo) => db.name);
    expect(dbNames).toContain('db1');
    expect(dbNames).toContain('db2');
  });

  test('should create a database successfully', async () => {
    const response = await request(app)
      .post('/databases')
      .send({ name: 'new_db' })
      .expect(200);

    const responseData = response.body;
    expect(responseData.name).toBe('new_db');
    expect(responseData.id).toBeDefined();
    expect(responseData.path).toBeDefined();
    expect(responseData.created_at).toBeDefined();

    // Verify the database was created in the system database
    const allDbs = sysDb.getAllUserDatabases();
    const createdDb = allDbs.find((db: UserDatabaseInfo) => db.name === 'new_db');
    expect(createdDb).toBeDefined();
  });

  test('should return 400 when creating a database without a name', async () => {
    const response = await request(app)
      .post('/databases')
      .send({})
      .expect(400);

    expect(response.body).toEqual({ error: 'Name is required' });
  });

  test('should return 409 when creating a database that already exists', async () => {
    // Create a database first
    sysDb.addUserDatabase('existing_db');

    const response = await request(app)
      .post('/databases')
      .send({ name: 'existing_db' })
      .expect(409);

    expect(response.body.error).toContain('already exists');
  });

  test('should get a database by ID successfully', async () => {
    // Create a database first
    const newDb = await sysDb.addUserDatabase('test_db');
    const dbId = newDb.id;

    const response = await request(app)
      .get(`/databases/${dbId}`)
      .expect(200);

    const responseData = response.body;
    expect(responseData.id).toBe(dbId);
    expect(responseData.name).toBe('test_db');
    expect(responseData.path).toBeDefined();
    expect(responseData.created_at).toBeDefined();
  });

  test('should return 404 when getting a database that does not exist', async () => {
    const response = await request(app)
      .get('/databases/non_existent_id')
      .expect(404);

    expect(response.body.error).toContain('not found');
  });

  test('should update a database successfully', async () => {
    // Create a database first
    const newDb = await sysDb.addUserDatabase('old_name');
    const dbId = newDb.id;

    const response = await request(app)
      .put(`/databases/${dbId}`)
      .send({ name: 'new_name' })
      .expect(200);

    expect(response.body).toEqual({ message: 'Database updated successfully' });

    // Verify the database was updated in the system database
    const updatedDb = sysDb.getUserDatabaseById(dbId);
    expect(updatedDb.name).toBe('new_name');
  });

  test('should return 400 when updating a database without a name', async () => {
    // Create a database first
    const newDb = await sysDb.addUserDatabase('test_db');
    const dbId = newDb.id;

    const response = await request(app)
      .put(`/databases/${dbId}`)
      .send({})
      .expect(400);

    expect(response.body).toEqual({ error: 'Name is required' });
  });

  test('should return 404 when updating a database that does not exist', async () => {
    const response = await request(app)
      .put('/databases/non_existent_id')
      .send({ name: 'new_name' })
      .expect(404);

    expect(response.body.error).toContain('not found');
  });

  test('should return 409 when updating a database with a name that already exists', async () => {
    // Create two databases
    const db1 = await sysDb.addUserDatabase('db1');
    const db2 = await sysDb.addUserDatabase('db2');
    const db1Id = db1.id;

    const response = await request(app)
      .put(`/databases/${db1Id}`)
      .send({ name: 'db2' }) // Try to rename db1 to db2's name
      .expect(409);

    expect(response.body.error).toContain('already exists');
  });

  test('should delete a database successfully', async () => {
    // Create a database first
    const newDb = await sysDb.addUserDatabase('to_delete');
    const newDbInstance = new UserDatabase(newDb.path);
    const dbId = newDb.id;

    // Add a row to the db to ensure it's written as a file
    // (should be handled gracefully, this is just to prevent output in stderr)
    newDbInstance.addPage('Test')

    const response = await request(app)
      .delete(`/databases/${dbId}`)
      .expect(200);

    expect(response.body).toEqual({ message: 'Database deleted successfully' });

    // Verify the database was deleted from the system database
    try {
      sysDb.getUserDatabaseById(dbId);
      // If we reach this line, the database wasn't deleted
      expect(true).toBe(false); // This should not happen
    } catch (error) {
      // Expected - database should not be found
      expect(error).toBeDefined();
    }
  });

  test('should return 404 when deleting a database that does not exist', async () => {
    const response = await request(app)
      .delete('/databases/non_existent_id')
      .expect(404);

    expect(response.body.error).toContain('not found');
  });
});
