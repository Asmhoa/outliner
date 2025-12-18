import { Router, Request, Response } from 'express';
import { DatabaseService, UserDatabaseService } from '../services';
import { WorkspaceNotFoundError } from '../database/errors';
import { WorkspaceCreate, WorkspaceUpdate, WorkspaceResponse } from '../models/api-types';

const router: Router = Router();

// POST /api/workspaces - Create a new workspace
router.post('/', (req: Request, res: Response) => {
  let dbService: DatabaseService | null = null;
  let userDbService: UserDatabaseService | null = null;
  try {
    const { db_id } = req.params;
    const { name, color } = req.body as WorkspaceCreate;

    // Validate request body
    if (!name || !color) {
      return res.status(400).json({ error: 'Name and color are required' });
    }

    dbService = new DatabaseService(process.env.SYSTEM_DB_PATH || 'system.db');
    userDbService = dbService.getUserDatabaseService(db_id);

    const workspaceId = userDbService.addWorkspace(name, color);
    res.status(201).json({
      workspace_id: workspaceId,
      name,
      color,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create workspace' });
  } finally {
    userDbService?.close();
    dbService?.close();
  }
});

// GET /api/workspaces - Get all workspaces
router.get('/', (req: Request, res: Response) => {
  let dbService: DatabaseService | null = null;
  let userDbService: UserDatabaseService | null = null;
  try {
    const { db_id } = req.params;

    dbService = new DatabaseService(process.env.SYSTEM_DB_PATH || 'system.db');
    userDbService = dbService.getUserDatabaseService(db_id);

    const workspaces = userDbService.getAllWorkspaces();
    res.json(workspaces.map(workspace => ({
      workspace_id: workspace.id,
      name: workspace.name,
      color: workspace.color,
      created_at: workspace.createdAt.toISOString()
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve workspaces' });
  } finally {
    userDbService?.close();
    dbService?.close();
  }
});

// GET /api/workspaces/:workspaceId - Get a specific workspace
router.get('/:workspaceId', (req: Request, res: Response) => {
  let dbService: DatabaseService | null = null;
  let userDbService: UserDatabaseService | null = null;
  try {
    const { db_id, workspaceId } = req.params;

    dbService = new DatabaseService(process.env.SYSTEM_DB_PATH || 'system.db');
    userDbService = dbService.getUserDatabaseService(db_id);

    const workspaceIdNum = parseInt(workspaceId, 10);
    const workspace = userDbService.getWorkspaceById(workspaceIdNum);

    if (!workspace) {
      throw new WorkspaceNotFoundError(`Workspace with ID ${workspaceIdNum} not found`);
    }

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
    res.status(500).json({ error: 'Failed to retrieve workspace' });
  } finally {
    userDbService?.close();
    dbService?.close();
  }
});

// PUT /api/workspaces/:workspaceId - Update a workspace
router.put('/:workspaceId', (req: Request, res: Response) => {
  let dbService: DatabaseService | null = null;
  let userDbService: UserDatabaseService | null = null;
  try {
    const { db_id, workspaceId } = req.params;
    const { name, color } = req.body as WorkspaceUpdate;

    // Validate request body
    if (!name || !color) {
      return res.status(400).json({ error: 'Name and color are required' });
    }

    dbService = new DatabaseService(process.env.SYSTEM_DB_PATH || 'system.db');
    userDbService = dbService.getUserDatabaseService(db_id);

    const workspaceIdNum = parseInt(workspaceId, 10);
    const success = userDbService.updateWorkspace(workspaceIdNum, name, color);

    res.json({ message: 'Workspace updated successfully' });
  } catch (error) {
    if (error instanceof WorkspaceNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update workspace' });
  } finally {
    userDbService?.close();
    dbService?.close();
  }
});

// DELETE /api/workspaces/:workspaceId - Delete a workspace
router.delete('/:workspaceId', (req: Request, res: Response) => {
  let dbService: DatabaseService | null = null;
  let userDbService: UserDatabaseService | null = null;
  try {
    const { db_id, workspaceId } = req.params;

    dbService = new DatabaseService(process.env.SYSTEM_DB_PATH || 'system.db');
    userDbService = dbService.getUserDatabaseService(db_id);

    const workspaceIdNum = parseInt(workspaceId, 10);
    const success = userDbService.deleteWorkspace(workspaceIdNum);

    res.json({ message: 'Workspace deleted successfully' });
  } catch (error) {
    if (error instanceof WorkspaceNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete workspace' });
  } finally {
    userDbService?.close();
    dbService?.close();
  }
});

export { router as workspacesRouter };