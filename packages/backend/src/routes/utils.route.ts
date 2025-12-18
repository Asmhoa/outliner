import { Router, Request, Response } from 'express';
import { SystemDatabase } from '../database/system';
import { UserDatabase } from '../database/user';
import { UserDatabaseNotFoundError } from '../database/errors';
import { SearchRequest, PageResponse, BlockResponse } from '../models/api-types';

const router: Router = Router();

// POST /api/utils/search - Search for pages and blocks
router.post('/search', (req: Request, res: Response) => {
  let sysDb: SystemDatabase | null = null;
  let userDb: UserDatabase | null = null;
  try {
    const { db_id } = req.params;
    const { query } = req.body as SearchRequest;

    // Validate request body
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    sysDb = new SystemDatabase(process.env.SYSTEM_DB_PATH || 'system.db');
    const dbInfo = sysDb.getUserDatabaseById(db_id);
    userDb = new UserDatabase(dbInfo.path);

    // Perform search in both pages and blocks
    const pageResults = userDb.searchPages(query);
    const blockResults = userDb.searchBlocks(query);

    // Format the results to match the expected response
    const formattedPages = pageResults.map(page => ({
      page_id: page.id,
      title: page.title,
      created_at: page.createdAt.toISOString()
    }));

    const formattedBlocks = blockResults.map(block => ({
      block_id: block.id,
      content: block.content,
      page_id: block.pageId,
      parent_block_id: block.parentBlockId,
      position: block.position,
      type: block.type,
      created_at: block.createdAt.toISOString()
    }));

    res.json({
      pages: formattedPages,
      blocks: formattedBlocks
    });
  } catch (error) {
    if (error instanceof UserDatabaseNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to search' });
  } finally {
    userDb?.close();
    sysDb?.close();
  }
});

export { router as utilsRouter };