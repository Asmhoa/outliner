import { Router, Request, Response } from 'express';
import { SystemDatabase } from '../database/system';
import { UserDatabase } from '../database/user';
import { PageNotFoundError, UserDatabaseNotFoundError } from '../database/errors';
import { PageCreate, PageRename, PageResponse } from '../models/api-types';

const router: Router = Router();

// POST /api/pages - Create a new page
router.post('/', (req: Request, res: Response) => {
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
    res.status(201).json({ page_id: pageId });
  } catch (error) {
    if (error instanceof PageNotFoundError) {
      return res.status(404).json({ error: error.message });
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

// GET /api/pages - Get all pages
router.get('/', (req: Request, res: Response) => {
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
      created_at: page.createdAt.toISOString()
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

// GET /api/pages/:pageId - Get a specific page
router.get('/:pageId', (req: Request, res: Response) => {
  let sysDb: SystemDatabase | null = null;
  let userDb: UserDatabase | null = null;
  try {
    const { db_id, pageId } = req.params;

    sysDb = new SystemDatabase(process.env.SYSTEM_DB_PATH || 'system.db');
    const dbInfo = sysDb.getUserDatabaseById(db_id);
    userDb = new UserDatabase(dbInfo.path);

    const pageIdNum = parseInt(pageId, 10);
    const page = userDb.getPageById(pageIdNum);

    res.json({
      page_id: page.id,
      title: page.title,
      created_at: page.createdAt.toISOString()
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

// PUT /api/pages/:pageId - Update a page
router.put('/:pageId', (req: Request, res: Response) => {
  let sysDb: SystemDatabase | null = null;
  let userDb: UserDatabase | null = null;
  try {
    const { db_id, pageId } = req.params;
    const { new_title } = req.body as PageRename;

    // Validate request body
    if (!new_title) {
      return res.status(400).json({ error: 'New title is required' });
    }

    sysDb = new SystemDatabase(process.env.SYSTEM_DB_PATH || 'system.db');
    const dbInfo = sysDb.getUserDatabaseById(db_id);
    userDb = new UserDatabase(dbInfo.path);

    const pageIdNum = parseInt(pageId, 10);
    // Check page existence (this will throw PageNotFoundError if not found)
    userDb.getPageById(pageIdNum);
    const success = userDb.updatePageTitle(pageIdNum, new_title);

    res.json({ message: 'Page updated successfully' });
  } catch (error) {
    if (error instanceof PageNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    if (error instanceof UserDatabaseNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update page' });
  } finally {
    userDb?.close();
    sysDb?.close();
  }
});

// DELETE /api/pages/:pageId - Delete a page
router.delete('/:pageId', (req: Request, res: Response) => {
  let sysDb: SystemDatabase | null = null;
  let userDb: UserDatabase | null = null;
  try {
    const { db_id, pageId } = req.params;

    sysDb = new SystemDatabase(process.env.SYSTEM_DB_PATH || 'system.db');
    const dbInfo = sysDb.getUserDatabaseById(db_id);
    userDb = new UserDatabase(dbInfo.path);

    const pageIdNum = parseInt(pageId, 10);
    // Check page existence (this will throw PageNotFoundError if not found)
    userDb.getPageById(pageIdNum);
    const success = userDb.deletePage(pageIdNum);

    res.json({ message: 'Page deleted successfully' });
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