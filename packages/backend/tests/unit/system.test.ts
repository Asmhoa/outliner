import fs from 'fs';
import path from 'path';
import os from 'os';
import { SystemDatabase } from '../../src/database/system';
import { UserDatabase } from '../../src/database/user';
import { UserDatabaseAlreadyExistsError, UserDatabaseNotFoundError } from '../../src/database/errors';

describe('SystemDatabase', () => {
  let tempDir: string;
  let sysDb: SystemDatabase;

  beforeEach(() => {
    // Create a temporary directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-system-db-'));
    const sysDbPath = path.join(tempDir, 'system.db');

    sysDb = new SystemDatabase(sysDbPath, tempDir); // Use tempDir for user databases too
  });

  afterEach(() => {
    // Close the database connection and clean up the temporary directory
    sysDb.close();

    // Remove the temporary directory and all its contents
    fs.rmSync(tempDir, { recursive: true, force: true });
  });


  test('[add] should add and retrieve user database', async () => {
    // Test that a new user database can be added and loaded
    const dbName = 'test_db';
    const expectedPath = 'test_db.db'; // Path is calculated from name

    const dbInfo = await sysDb.addUserDatabase(dbName);

    // Check that the information was stored correctly
    expect(dbInfo.name).toBe(dbName);
    expect(dbInfo.path).toBe(expectedPath);
    expect(typeof dbInfo.id).toBe('string'); // UUID should be a string
    expect(dbInfo.createdAt).toBeInstanceOf(Date);

    // Retrieve by ID
    const retrievedById = sysDb.getUserDatabaseById(dbInfo.id);
    expect(retrievedById).not.toBeNull();
    expect(retrievedById!.name).toBe(dbName);

    // Retrieve by getting all databases
    const allDbs = sysDb.getAllUserDatabases();
    expect(allDbs).toHaveLength(1);
    expect(allDbs[0].name).toBe(dbName);
  });


  test('[add] should throw error when adding database with existing name', async () => {
    // Test that adding a database with a name that already exists raises an error
    const dbName = 'test_db';

    await sysDb.addUserDatabase(dbName);

    // Attempting to add another database with the same name should raise an error
    await expect(sysDb.addUserDatabase(dbName))
      .rejects
      .toThrow(UserDatabaseAlreadyExistsError);
  });

  test('[read] should throw error when getting database that does not exist', () => {
    // Test that getting a database that doesn't exist raises an error
    expect(() => {
      sysDb.getUserDatabaseById('non_existent_db_id');
    }).toThrow(UserDatabaseNotFoundError);
  });

  test('[read] should return empty array when no databases exist', () => {
    // Test that all user databases can be retrieved
    const allDbs = sysDb.getAllUserDatabases();
    expect(allDbs).toHaveLength(0);
  });

  test('[read] should retrieve user database by path', async () => {
    // Test that a database can be retrieved by path
    const dbName = 'test_db';
    const dbInfo = await sysDb.addUserDatabase(dbName);

    const retrievedDbInfo = sysDb.getUserDatabaseByPath(dbInfo.path);
    expect(retrievedDbInfo.name).toBe(dbName);
  });

  test('[read] should throw error when getting database by path that does not exist', () => {
    // Test that getting a database by path that doesn't exist raises an error
    expect(() => {
      sysDb.getUserDatabaseByPath('/non/existent/path.db');
    }).toThrow(UserDatabaseNotFoundError);
  });

  test('[read] should return all user databases', async () => {
    // Add two databases
    await sysDb.addUserDatabase('test_db1');
    await sysDb.addUserDatabase('test_db2');

    const allDbs = sysDb.getAllUserDatabases();
    expect(allDbs).toHaveLength(2);

    // Check that both databases are present (order may vary due to timestamp precision)
    const dbNames = allDbs.map(db => db.name);
    expect(dbNames).toContain('test_db1');
    expect(dbNames).toContain('test_db2');
  });

  test('[update] should update user database name', async () => {
    // Test updating a user database
    const dbInfo = await sysDb.addUserDatabase('test_db');

    // Update the database name
    const updated = await sysDb.updateUserDatabase(dbInfo.id, 'new_test_db');

    expect(updated).toBe(true); // Update should succeed

    // Verify the name and path were updated correctly
    const updatedDbInfo = sysDb.getUserDatabaseById(dbInfo.id);
    expect(updatedDbInfo).not.toBeNull();
    expect(updatedDbInfo!.name).toBe('new_test_db');
    expect(updatedDbInfo!.path).toBe('new_test_db.db'); // Path should reflect the new name
  });

  test('[update] should not change database when updating with no new data', async () => {
    // Test that nothing happens when updating a database with no new data
    const dbInfo = await sysDb.addUserDatabase('test_db');
    const originalDbInfo = sysDb.getUserDatabaseById(dbInfo.id);

    const updated = await sysDb.updateUserDatabase(dbInfo.id); // No new name or path

    expect(updated).toBe(true); // Update should succeed (no-op)

    // Verify that the database info remains unchanged
    const updatedDbInfo = sysDb.getUserDatabaseById(dbInfo.id);
    expect(updatedDbInfo.name).toBe(originalDbInfo.name);
    expect(updatedDbInfo.path).toBe(originalDbInfo.path);
  });

  test('[update] should throw error when trying to update non-existent database', async () => {
    // Test that updating a database that doesn't exist raises an error
    await expect(sysDb.updateUserDatabase('non_existent_db_id', 'new_name'))
      .rejects
      .toThrow(UserDatabaseNotFoundError);
  });

  test('[update] should throw error when updating database to existing name', async () => {
    // Test that updating a database to a name that already exists raises an error
    await sysDb.addUserDatabase('test_db1');
    await sysDb.addUserDatabase('test_db2');

    const db1Info = sysDb.getUserDatabaseByName('test_db1');

    // Trying to rename test_db2 to test_db1 (which already exists) should raise an error
    await expect(sysDb.updateUserDatabase(db1Info.id, 'test_db2'))
      .rejects
      .toThrow(UserDatabaseAlreadyExistsError);
  });

  test('[delete] should delete user database', async () => {
    // Test that a user database can be deleted
    const dbInfo = await sysDb.addUserDatabase('test_db');

    const deleted = await sysDb.deleteUserDatabase(dbInfo.id);
    expect(deleted).toBe(true);

    // Verify the database is no longer retrievable
    expect(() => {
      sysDb.getUserDatabaseById(dbInfo.id);
    }).toThrow(UserDatabaseNotFoundError);
  });

  test('[update] should rename user database file in the file system', async () => {
    // Test that renaming a user database also renames its corresponding file
    const originalName = 'original_db';
    const newName = 'renamed_db';
    const expectedOriginalPath = 'original_db.db';
    const expectedNewPath = 'renamed_db.db';

    // Add a user database - this will set up the entry in system.db
    const dbInfo = await sysDb.addUserDatabase(originalName);

    // Create the actual user database file in the databases directory
    // SystemDatabase internally sets databasesDir relative to its location
    // For this test using a temp system DB, the actual user DBs are also in the same temp dir
    const originalDbPath = path.join(tempDir, expectedOriginalPath);
    const originalUserDb = new UserDatabase(originalDbPath);
    originalUserDb.close(); // Create and close, to initialize the file

    // Verify original file exists
    expect(fs.existsSync(originalDbPath)).toBe(true);

    // Rename the user database
    const updated = await sysDb.updateUserDatabase(dbInfo.id, newName);
    expect(updated).toBe(true);

    // Verify the database entry is updated
    const updatedDbInfo = sysDb.getUserDatabaseById(dbInfo.id);
    expect(updatedDbInfo.name).toBe(newName);
    expect(updatedDbInfo.path).toBe(expectedNewPath);

    // Verify file system changes
    const newDbPath = path.join(tempDir, expectedNewPath);
    expect(fs.existsSync(originalDbPath)).toBe(false); // Original file should be gone
    expect(fs.existsSync(newDbPath)).toBe(true); // New file should exist
  });

  test('[delete] should throw error when trying to delete non-existent database', async () => {
    // Test that deleting a database that doesn't exist raises an error
    await expect(sysDb.deleteUserDatabase('non_existent_db_id'))
      .rejects
      .toThrow(UserDatabaseNotFoundError);
  });

  test('[add] should create default tables in user database', () => {
    // Test that when a user database file is created, it has the required tables
    const tempUserDbPath = path.join(tempDir, 'user_test.db');
    const userDb = new UserDatabase(tempUserDbPath);

    // Check that the tables were created by querying sqlite_master
    const tablesStmt = userDb['db'].prepare(`
      SELECT name FROM sqlite_master WHERE type='table'
    `);
    const tables = tablesStmt.all() as Array<{name: string}>;

    // Check for expected tables
    const tableNames = tables.map(t => t.name);
    expect(tableNames).toContain('workspaces');
    expect(tableNames).toContain('pages');
    expect(tableNames).toContain('blocks');

    userDb.close();
  });
});
