import { Router, Request, Response } from 'express';
import { DatabaseService, UserDatabaseService } from '../services';
import { SearchRequest } from '../types/global';

const router = Router();

// POST /api/utils/search - Search for pages and blocks
router.post('/search', (req: Request, res: Response) => {
  let dbService: DatabaseService | null = null;
  let userDbService: UserDatabaseService | null = null;
  try {
    const { db_id } = req.params;
    const { query } = req.body as SearchRequest;

    // Validate request body
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    dbService = new DatabaseService(process.env.SYSTEM_DB_PATH || 'system.db');
    userDbService = dbService.getUserDatabaseService(db_id);

    // Perform search in both pages and blocks
    const pageResults = userDbService.searchPages(query);
    const blockResults = userDbService.searchBlocks(query);

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
    res.status(500).json({ error: 'Failed to search' });
  } finally {
    userDbService?.close();
    dbService?.close();
  }
});

export { router as utilsRouter };