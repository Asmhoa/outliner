import { Router, Request, Response } from 'express';
import { DatabaseService, UserDatabaseService } from '../services';
import { PageNotFoundError } from '../database/errors';
import { PageCreate, PageRename } from '../types/global';

const router = Router();

// POST /api/pages - Create a new page
router.post('/', (req: Request, res: Response) => {
  let dbService: DatabaseService | null = null;
  let userDbService: UserDatabaseService | null = null;
  try {
    const { db_id } = req.params;
    const { title } = req.body as PageCreate;

    // Validate request body
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    dbService = new DatabaseService(process.env.SYSTEM_DB_PATH || 'system.db');
    userDbService = dbService.getUserDatabaseService(db_id);

    const pageId = userDbService.addPage(title);
    res.status(201).json({ page_id: pageId });
  } catch (error) {
    if (error instanceof PageNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create page' });
  } finally {
    userDbService?.close();
    dbService?.close();
  }
});

// GET /api/pages - Get all pages
router.get('/', (req: Request, res: Response) => {
  let dbService: DatabaseService | null = null;
  let userDbService: UserDatabaseService | null = null;
  try {
    const { db_id } = req.params;

    dbService = new DatabaseService(process.env.SYSTEM_DB_PATH || 'system.db');
    userDbService = dbService.getUserDatabaseService(db_id);

    const pages = userDbService.getAllPages();
    res.json(pages.map(page => ({
      page_id: page.id,
      title: page.title,
      created_at: page.createdAt.toISOString()
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve pages' });
  } finally {
    userDbService?.close();
    dbService?.close();
  }
});

// GET /api/pages/:pageId - Get a specific page
router.get('/:pageId', (req: Request, res: Response) => {
  let dbService: DatabaseService | null = null;
  let userDbService: UserDatabaseService | null = null;
  try {
    const { db_id, pageId } = req.params;

    dbService = new DatabaseService(process.env.SYSTEM_DB_PATH || 'system.db');
    userDbService = dbService.getUserDatabaseService(db_id);

    const pageIdNum = parseInt(pageId, 10);
    const page = userDbService.getPageById(pageIdNum);

    res.json({
      page_id: page.id,
      title: page.title,
      created_at: page.createdAt.toISOString()
    });
  } catch (error) {
    if (error instanceof PageNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to retrieve page' });
  } finally {
    userDbService?.close();
    dbService?.close();
  }
});

// PUT /api/pages/:pageId - Update a page
router.put('/:pageId', (req: Request, res: Response) => {
  let dbService: DatabaseService | null = null;
  let userDbService: UserDatabaseService | null = null;
  try {
    const { db_id, pageId } = req.params;
    const { new_title } = req.body as PageRename;

    // Validate request body
    if (!new_title) {
      return res.status(400).json({ error: 'New title is required' });
    }

    dbService = new DatabaseService(process.env.SYSTEM_DB_PATH || 'system.db');
    userDbService = dbService.getUserDatabaseService(db_id);

    const pageIdNum = parseInt(pageId, 10);
    const success = userDbService.updatePageTitle(pageIdNum, new_title);

    res.json({ message: 'Page updated successfully' });
  } catch (error) {
    if (error instanceof PageNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update page' });
  } finally {
    userDbService?.close();
    dbService?.close();
  }
});

// DELETE /api/pages/:pageId - Delete a page
router.delete('/:pageId', (req: Request, res: Response) => {
  let dbService: DatabaseService | null = null;
  let userDbService: UserDatabaseService | null = null;
  try {
    const { db_id, pageId } = req.params;

    dbService = new DatabaseService(process.env.SYSTEM_DB_PATH || 'system.db');
    userDbService = dbService.getUserDatabaseService(db_id);

    const pageIdNum = parseInt(pageId, 10);
    const success = userDbService.deletePage(pageIdNum);

    res.json({ message: 'Page deleted successfully' });
  } catch (error) {
    if (error instanceof PageNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete page' });
  } finally {
    userDbService?.close();
    dbService?.close();
  }
});

export { router as pagesRouter };