import { Router, Request, Response } from 'express';
import { SystemDatabase } from '../database/system';
import { UserDatabase } from '../database/user';
import { WorkspaceNotFoundError, UserDatabaseNotFoundError } from '../database/errors';
import { WorkspaceCreate, WorkspaceUpdate, WorkspaceResponse } from '../models/api-types';

const router: Router = Router();

// POST /api/workspaces - Create a new workspace
router.post('/', (req: Request, res: Response) => {
  let sysDb: SystemDatabase | null = null;
  let userDb: UserDatabase | null = null;
  try {
    const { db_id } = req.params;
    const { name, color } = req.body as WorkspaceCreate;

    // Validate request body
    if (!name || !color) {
      return res.status(400).json({ error: 'Name and color are required' });
    }

    sysDb = new SystemDatabase(process.env.SYSTEM_DB_PATH || 'system.db');
    const dbInfo = sysDb.getUserDatabaseById(db_id);
    userDb = new UserDatabase(dbInfo.path);

    const workspaceId = userDb.addWorkspace(name, color);
    res.status(201).json({
      workspace_id: workspaceId,
      name,
      color,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    if (error instanceof UserDatabaseNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create workspace' });
  } finally {
    userDb?.close();
    sysDb?.close();
  }
});

// GET /api/workspaces - Get all workspaces
router.get('/', (req: Request, res: Response) => {
  let sysDb: SystemDatabase | null = null;
  let userDb: UserDatabase | null = null;
  try {
    const { db_id } = req.params;

    sysDb = new SystemDatabase(process.env.SYSTEM_DB_PATH || 'system.db');
    const dbInfo = sysDb.getUserDatabaseById(db_id);
    userDb = new UserDatabase(dbInfo.path);

    const workspaces = userDb.getAllWorkspaces();
    res.json(workspaces.map(workspace => ({
      workspace_id: workspace.id,
      name: workspace.name,
      color: workspace.color,
      created_at: workspace.createdAt.toISOString()
    })));
  } catch (error) {
    if (error instanceof UserDatabaseNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to retrieve workspaces' });
  } finally {
    userDb?.close();
    sysDb?.close();
  }
});

// GET /api/workspaces/:workspaceId - Get a specific workspace
router.get('/:workspaceId', (req: Request, res: Response) => {
  let sysDb: SystemDatabase | null = null;
  let userDb: UserDatabase | null = null;
  try {
    const { db_id, workspaceId } = req.params;

    sysDb = new SystemDatabase(process.env.SYSTEM_DB_PATH || 'system.db');
    const dbInfo = sysDb.getUserDatabaseById(db_id);
    userDb = new UserDatabase(dbInfo.path);

    const workspaceIdNum = parseInt(workspaceId, 10);
    const workspace = userDb.getWorkspaceById(workspaceIdNum);

    res.json({
      workspace_id: workspace.id,
      name: workspace.name,
      color: workspace.color,
      created_at: workspace.createdAt.toISOString()
    });
  } catch (error) {
    if (error instanceof WorkspaceNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    if (error instanceof UserDatabaseNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to retrieve workspace' });
  } finally {
    userDb?.close();
    sysDb?.close();
  }
});

// PUT /api/workspaces/:workspaceId - Update a workspace
router.put('/:workspaceId', (req: Request, res: Response) => {
  let sysDb: SystemDatabase | null = null;
  let userDb: UserDatabase | null = null;
  try {
    const { db_id, workspaceId } = req.params;
    const { name, color } = req.body as WorkspaceUpdate;

    // Validate request body
    if (!name || !color) {
      return res.status(400).json({ error: 'Name and color are required' });
    }

    sysDb = new SystemDatabase(process.env.SYSTEM_DB_PATH || 'system.db');
    const dbInfo = sysDb.getUserDatabaseById(db_id);
    userDb = new UserDatabase(dbInfo.path);

    const workspaceIdNum = parseInt(workspaceId, 10);
    // Check workspace existence (this will throw WorkspaceNotFoundError if not found)
    userDb.getWorkspaceById(workspaceIdNum);
    const success = userDb.updateWorkspace(workspaceIdNum, name, color);

    res.json({ message: 'Workspace updated successfully' });
  } catch (error) {
    if (error instanceof WorkspaceNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    if (error instanceof UserDatabaseNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update workspace' });
  } finally {
    userDb?.close();
    sysDb?.close();
  }
});

// DELETE /api/workspaces/:workspaceId - Delete a workspace
router.delete('/:workspaceId', (req: Request, res: Response) => {
  let sysDb: SystemDatabase | null = null;
  let userDb: UserDatabase | null = null;
  try {
    const { db_id, workspaceId } = req.params;

    sysDb = new SystemDatabase(process.env.SYSTEM_DB_PATH || 'system.db');
    const dbInfo = sysDb.getUserDatabaseById(db_id);
    userDb = new UserDatabase(dbInfo.path);

    const workspaceIdNum = parseInt(workspaceId, 10);
    // Check workspace existence (this will throw WorkspaceNotFoundError if not found)
    userDb.getWorkspaceById(workspaceIdNum);
    const success = userDb.deleteWorkspace(workspaceIdNum);

    res.json({ message: 'Workspace deleted successfully' });
  } catch (error) {
    if (error instanceof WorkspaceNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    if (error instanceof UserDatabaseNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete workspace' });
  } finally {
    userDb?.close();
    sysDb?.close();
  }
});

export { router as workspacesRouter };