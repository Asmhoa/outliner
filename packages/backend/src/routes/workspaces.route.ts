import { Router, Request, Response } from 'express';
import { WorkspaceNotFoundError, UserDatabaseNotFoundError } from '../database/errors';
import { getUserDatabase } from '../database/system.provider';
import { WorkspaceCreate, WorkspaceUpdate } from './requests';
import { Workspace } from '../database/entities';

const router: Router = Router();

// POST /db/{db_id}/workspaces - Create a new workspace
router.post('/db/:db_id/workspaces', (req: Request, res: Response) => {
  let userDb = null;
  try {
    const { db_id } = req.params;
    const { name, color } = req.body as WorkspaceCreate;

    // Validate request body
    if (!name || !color) {
      return res.status(400).json({ error: 'Name and color are required' });
    }

    userDb = getUserDatabase(db_id);

    const workspaceId = userDb.addWorkspace(name, color);
    res.status(200).json({
      workspace_id: workspaceId,
      name,
      color,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    if (error instanceof WorkspaceNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    if (error instanceof UserDatabaseNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create workspace' });
  } finally {
    userDb?.close();
  }
});

// GET /db/{db_id}/workspaces/{workspace_id} - Get a specific workspace
router.get('/db/:db_id/workspaces/:workspace_id', (req: Request, res: Response) => {
  let userDb = null;
  try {
    const { db_id, workspace_id } = req.params;

    userDb = getUserDatabase(db_id);

    const workspaceIdNum = parseInt(workspace_id, 10);
    const workspace = userDb.getWorkspaceById(workspaceIdNum);

    res.json({
      workspace_id: workspace.id,
      name: workspace.name,
      color: workspace.color
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
  }
});

// GET /db/{db_id}/workspaces - Get all workspaces
router.get('/db/:db_id/workspaces', (req: Request, res: Response) => {
  let userDb = null;
  try {
    const { db_id } = req.params;

    userDb = getUserDatabase(db_id);

    const workspaces = userDb.getAllWorkspaces();
    res.json(workspaces.map(workspace => ({
      workspace_id: workspace.id,
      name: workspace.name,
      color: workspace.color
    })));
  } catch (error) {
    if (error instanceof UserDatabaseNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to retrieve workspaces' });
  } finally {
    userDb?.close();
  }
});

// PUT /db/{db_id}/workspaces - Update a workspace
router.put('/db/:db_id/workspaces', (req: Request, res: Response) => {
  let userDb = null;
  try {
    const { db_id } = req.params;
    const { workspace_id, new_name, new_color } = req.body as WorkspaceUpdate;

    // Validate request body
    if (!workspace_id || !new_name || !new_color) {
      return res.status(400).json({ error: 'workspace_id, new_name and new_color are required' });
    }

    userDb = getUserDatabase(db_id);

    userDb.updateWorkspace(Number(workspace_id), new_name, new_color);

    res.json({ status: 'success' });
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
  }
});

// DELETE /db/{db_id}/workspaces/{workspace_id} - Delete a workspace
router.delete('/db/:db_id/workspaces/:workspace_id', (req: Request, res: Response) => {
  let userDb = null;
  try {
    const { db_id, workspace_id } = req.params;

    userDb = getUserDatabase(db_id);

    const workspaceIdNum = parseInt(workspace_id, 10);
    userDb.deleteWorkspace(workspaceIdNum);

    res.json({ status: 'success' });
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
  }
});

export { router as workspacesRouter };
