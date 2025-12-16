import { Router, Request, Response } from 'express';
import { SystemDatabaseService } from '../services';
import { UserDatabaseNotFoundError } from '../database/errors';
import { DatabaseCreate, DatabaseUpdate } from '../types/global';

const router = Router();

// GET /api/databases - Get all databases
router.get('/', (req: Request, res: Response) => {
  let sysDbService: SystemDatabaseService | null = null;
  try {
    sysDbService = new SystemDatabaseService(process.env.SYSTEM_DB_PATH || 'system.db');
    const databases = sysDbService.getAllUserDatabases();
    res.json(databases);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve databases' });
  } finally {
    sysDbService?.close();
  }
});

// POST /api/databases - Create a new database
router.post('/', (req: Request, res: Response) => {
  let sysDbService: SystemDatabaseService | null = null;
  try {
    const { name, path } = req.body as DatabaseCreate;

    // Validate request body
    if (!name || !path) {
      return res.status(400).json({ error: 'Name and path are required' });
    }

    sysDbService = new SystemDatabaseService(process.env.SYSTEM_DB_PATH || 'system.db');
    const newDb = sysDbService.addUserDatabase(name, path);
    res.status(201).json(newDb);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create database' });
  } finally {
    sysDbService?.close();
  }
});

// GET /api/databases/:id - Get a specific database
router.get('/:id', (req: Request, res: Response) => {
  let sysDbService: SystemDatabaseService | null = null;
  try {
    const { id } = req.params;

    sysDbService = new SystemDatabaseService(process.env.SYSTEM_DB_PATH || 'system.db');
    const dbInfo = sysDbService.getUserDatabaseById(id);

    res.json(dbInfo);
  } catch (error) {
    if (error instanceof UserDatabaseNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to retrieve database' });
  } finally {
    sysDbService?.close();
  }
});

// PUT /api/databases/:id - Update a database
router.put('/:id', (req: Request, res: Response) => {
  let sysDbService: SystemDatabaseService | null = null;
  try {
    const { id } = req.params;
    const { name } = req.body as DatabaseUpdate;

    // Validate request body
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    sysDbService = new SystemDatabaseService(process.env.SYSTEM_DB_PATH || 'system.db');
    const success = sysDbService.updateUserDatabase(id, name);

    res.json({ message: 'Database updated successfully' });
  } catch (error) {
    if (error instanceof UserDatabaseNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update database' });
  } finally {
    sysDbService?.close();
  }
});

// DELETE /api/databases/:id - Delete a database
router.delete('/:id', (req: Request, res: Response) => {
  let sysDbService: SystemDatabaseService | null = null;
  try {
    const { id } = req.params;

    sysDbService = new SystemDatabaseService(process.env.SYSTEM_DB_PATH || 'system.db');
    const success = sysDbService.removeUserDatabase(id);

    res.json({ message: 'Database deleted successfully' });
  } catch (error) {
    if (error instanceof UserDatabaseNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete database' });
  } finally {
    sysDbService?.close();
  }
});

export { router as databasesRouter };