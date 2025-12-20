import { Router, Request, Response } from 'express';
import { SystemDatabase } from '../database/system';
import { UserDatabaseNotFoundError } from '../database/errors';
import { DatabaseCreate, DatabaseUpdate } from './requests';

const router: Router = Router();

// GET /api/databases - Get all databases
router.get('/', (req: Request, res: Response) => {
  let sysDb: SystemDatabase | null = null;
  try {
    sysDb = new SystemDatabase(process.env.SYSTEM_DB_PATH || 'system.db');
    const databases = sysDb.getAllUserDatabases();
    res.json(databases);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve databases' });
  } finally {
    sysDb?.close();
  }
});

// POST /api/databases - Create a new database
router.post('/', (req: Request, res: Response) => {
  let sysDb: SystemDatabase | null = null;
  try {
    const { name } = req.body as DatabaseCreate;

    // Validate request body
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    sysDb = new SystemDatabase(process.env.SYSTEM_DB_PATH || 'system.db');
    const newDb = sysDb.addUserDatabase(name);
    res.status(201).json(newDb);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create database' });
  } finally {
    sysDb?.close();
  }
});

// GET /api/databases/:id - Get a specific database
router.get('/:id', (req: Request, res: Response) => {
  let sysDb: SystemDatabase | null = null;
  try {
    const { id } = req.params;

    sysDb = new SystemDatabase(process.env.SYSTEM_DB_PATH || 'system.db');
    const dbInfo = sysDb.getUserDatabaseById(id);

    res.json(dbInfo);
  } catch (error) {
    if (error instanceof UserDatabaseNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to retrieve database' });
  } finally {
    sysDb?.close();
  }
});

// PUT /api/databases/:id - Update a database
router.put('/:id', async (req: Request, res: Response) => {
  let sysDb: SystemDatabase | null = null;
  try {
    const { id } = req.params;
    const { name } = req.body as DatabaseUpdate;

    // Validate request body
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    sysDb = new SystemDatabase(process.env.SYSTEM_DB_PATH || 'system.db');
    const success = await sysDb.updateUserDatabase(id, name);

    res.json({ message: 'Database updated successfully' });
  } catch (error) {
    if (error instanceof UserDatabaseNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update database' });
  } finally {
    sysDb?.close();
  }
});

// DELETE /api/databases/:id - Delete a database
router.delete('/:id', (req: Request, res: Response) => {
  let sysDb: SystemDatabase | null = null;
  try {
    const { id } = req.params;

    sysDb = new SystemDatabase(process.env.SYSTEM_DB_PATH || 'system.db');
    const success = sysDb.deleteUserDatabase(id);

    res.json({ message: 'Database deleted successfully' });
  } catch (error) {
    if (error instanceof UserDatabaseNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete database' });
  } finally {
    sysDb?.close();
  }
});

export { router as databasesRouter };