import { Router, Request, Response } from 'express';
import { SystemDatabase } from '../database/system';
import { UserDatabaseNotFoundError, UserDatabaseAlreadyExistsError } from '../database/errors';
import { DatabaseCreate, DatabaseUpdate } from './requests';

const router: Router = Router();

// GET /databases - Get all databases
router.get('/databases', (req: Request, res: Response) => {
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

// POST /databases - Create a new database
router.post('/databases', async (req: Request, res: Response) => {
  let sysDb: SystemDatabase | null = null;
  try {
    const { name } = req.body as DatabaseCreate;

    // Validate request body
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    sysDb = new SystemDatabase(process.env.SYSTEM_DB_PATH || 'system.db');
    const newDb = await sysDb.addUserDatabase(name);
    res.status(200).json(newDb);
  } catch (error) {
    if (error instanceof UserDatabaseAlreadyExistsError) {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create database' });
  } finally {
    sysDb?.close();
  }
});

// GET /databases/{db_id} - Get a specific database
router.get('/databases/:db_id', (req: Request, res: Response) => {
  let sysDb: SystemDatabase | null = null;
  try {
    const { db_id } = req.params;

    sysDb = new SystemDatabase(process.env.SYSTEM_DB_PATH || 'system.db');
    const dbInfo = sysDb.getUserDatabaseById(db_id);

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

// PUT /databases/{db_id} - Update a database
router.put('/databases/:db_id', async (req: Request, res: Response) => {
  let sysDb: SystemDatabase | null = null;
  try {
    const { db_id } = req.params;
    const { name } = req.body as DatabaseUpdate;

    // Validate request body
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    sysDb = new SystemDatabase(process.env.SYSTEM_DB_PATH || 'system.db');
    const success = await sysDb.updateUserDatabase(db_id, name);

    res.json({ message: 'Database updated successfully' });
  } catch (error) {
    if (error instanceof UserDatabaseNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    if (error instanceof UserDatabaseAlreadyExistsError) {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update database' });
  } finally {
    sysDb?.close();
  }
});

// DELETE /databases/{db_id} - Delete a database
router.delete('/databases/:db_id', async (req: Request, res: Response) => {
  let sysDb: SystemDatabase | null = null;
  try {
    const { db_id } = req.params;

    sysDb = new SystemDatabase(process.env.SYSTEM_DB_PATH || 'system.db');
    const success = await sysDb.deleteUserDatabase(db_id);

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