import { Router, Request, Response } from 'express';
import { SystemDatabase } from '../database/system';
import { UserDatabase } from '../database/user';
import { PageNotFoundError, PageAlreadyExistsError, UserDatabaseNotFoundError } from '../database/errors';
import { PageCreate, PageRename } from './requests';
import { Page } from '../database/entities';

const router: Router = Router();

// POST /db/{db_id}/pages - Create a new page
router.post('/db/:db_id/pages', (req: Request, res: Response) => {
  let sysDb: SystemDatabase | null = null;
  let userDb: UserDatabase | null = null;
  try {
    const { db_id } = req.params;
    const { title } = req.body as PageCreate;

    // Validate request body
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    sysDb = new SystemDatabase(process.env.SYSTEM_DB_PATH || 'system.db');
    const dbInfo = sysDb.getUserDatabaseById(db_id);
    userDb = new UserDatabase(dbInfo.path);

    const pageId = userDb.addPage(title);
    res.status(200).json({ page_id: pageId });
  } catch (error) {
    if (error instanceof PageAlreadyExistsError) {
      return res.status(409).json({ error: error.message });
    }
    if (error instanceof UserDatabaseNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create page' });
  } finally {
    userDb?.close();
    sysDb?.close();
  }
});

// GET /db/{db_id}/pages/{page_id} - Get a specific page
router.get('/db/:db_id/pages/:page_id', (req: Request, res: Response) => {
  let sysDb: SystemDatabase | null = null;
  let userDb: UserDatabase | null = null;
  try {
    const { db_id, page_id } = req.params;

    sysDb = new SystemDatabase(process.env.SYSTEM_DB_PATH || 'system.db');
    const dbInfo = sysDb.getUserDatabaseById(db_id);
    userDb = new UserDatabase(dbInfo.path);

    const page = userDb.getPageById(page_id);

    res.json({
      page_id: page.id,
      title: page.title,
      created_at: page.created_at.toISOString()
    });
  } catch (error) {
    if (error instanceof PageNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    if (error instanceof UserDatabaseNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to retrieve page' });
  } finally {
    userDb?.close();
    sysDb?.close();
  }
});

// GET /db/{db_id}/pages - Get all pages
router.get('/db/:db_id/pages', (req: Request, res: Response) => {
  let sysDb: SystemDatabase | null = null;
  let userDb: UserDatabase | null = null;
  try {
    const { db_id } = req.params;

    sysDb = new SystemDatabase(process.env.SYSTEM_DB_PATH || 'system.db');
    const dbInfo = sysDb.getUserDatabaseById(db_id);
    userDb = new UserDatabase(dbInfo.path);

    const pages = userDb.getAllPages();
    res.json(pages.map(page => ({
      page_id: page.id,
      title: page.title,
      created_at: page.created_at.toISOString()
    })));
  } catch (error) {
    if (error instanceof UserDatabaseNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to retrieve pages' });
  } finally {
    userDb?.close();
    sysDb?.close();
  }
});

// PUT /db/{db_id}/pages - Rename a page
router.put('/db/:db_id/pages', (req: Request, res: Response) => {
  let sysDb: SystemDatabase | null = null;
  let userDb: UserDatabase | null = null;
  try {
    const { db_id } = req.params;
    const { page_id, new_title } = req.body as PageRename;

    // Validate request body
    if (!page_id || !new_title) {
      return res.status(400).json({ error: 'page_id and new_title are required' });
    }

    sysDb = new SystemDatabase(process.env.SYSTEM_DB_PATH || 'system.db');
    const dbInfo = sysDb.getUserDatabaseById(db_id);
    userDb = new UserDatabase(dbInfo.path);

    userDb.updatePageTitle(page_id, new_title);

    res.json({ status: 'success' });
  } catch (error) {
    if (error instanceof PageNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    if (error instanceof PageAlreadyExistsError) {
      return res.status(409).json({ error: error.message });
    }
    if (error instanceof UserDatabaseNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to rename page' });
  } finally {
    userDb?.close();
    sysDb?.close();
  }
});

// DELETE /db/{db_id}/pages/{page_id} - Delete a page
router.delete('/db/:db_id/pages/:page_id', (req: Request, res: Response) => {
  let sysDb: SystemDatabase | null = null;
  let userDb: UserDatabase | null = null;
  try {
    const { db_id, page_id } = req.params;

    sysDb = new SystemDatabase(process.env.SYSTEM_DB_PATH || 'system.db');
    const dbInfo = sysDb.getUserDatabaseById(db_id);
    userDb = new UserDatabase(dbInfo.path);

    userDb.deletePage(page_id);

    res.json({ status: 'success' });
  } catch (error) {
    if (error instanceof PageNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    if (error instanceof UserDatabaseNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete page' });
  } finally {
    userDb?.close();
    sysDb?.close();
  }
});

export { router as pagesRouter };