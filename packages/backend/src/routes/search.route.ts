import { Router, Request, Response } from 'express';
import { UserDatabaseNotFoundError } from '../database/errors';
import { getUserDatabase } from '../database/system.provider';
import { SearchRequest } from './requests';
import { Page, Block } from '../database/entities';

const router: Router = Router();

// POST /db/{db_id}/search - Search for pages and/or blocks
router.post('/db/:db_id/search', (req: Request, res: Response) => {
  let userDb = null;
  try {
    const { db_id } = req.params;
    const { query, limit = 10, search_type = "all", advanced = false } = req.body as SearchRequest;

    // Validate request body
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    userDb = getUserDatabase(db_id);

    // Determine whether to escape special characters based on advanced mode
    const escapeSpecialChars = !advanced;

    // Perform search based on the search_type parameter
    let pages: Page[], blocks: Block[];
    if (search_type === "pages") {
      pages = userDb.searchPages(query);
      blocks = [];
    } else if (search_type === "blocks") {
      pages = [];
      blocks = userDb.searchBlocks(query);
    } else if (search_type === "all") {
      [pages, blocks] = userDb.searchAll(query);
    } else {
      return res.status(400).json({ error: "Invalid search_type. Must be 'pages', 'blocks', or 'all'" });
    }

    // Format the results to match the expected response
    const formattedPages = pages.map(page => ({
      page_id: page.id,
      title: page.title,
      created_at: page.created_at.toISOString()
    }));

    const formattedBlocks = blocks.map(block => ({
      block_id: block.id,
      content: block.content,
      page_id: block.page_id,
      parent_block_id: block.parent_block_id,
      position: block.position,
      type: block.type,
      created_at: block.created_at.toISOString()
    }));

    res.json({
      pages: formattedPages,
      blocks: formattedBlocks
    });
  } catch (error) {
    if (error instanceof UserDatabaseNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: `Search failed: ${error}` });
  } finally {
    userDb?.close();
  }
});

// POST /db/{db_id}/rebuild-search - Rebuild the search index
router.post('/db/:db_id/rebuild-search', (req: Request, res: Response) => {
  let userDb = null;
  try {
    const { db_id } = req.params;

    userDb = getUserDatabase(db_id);

    // Rebuild the search index
    userDb.rebuildSearch();

    res.json({ message: 'Search index rebuilt successfully' });
  } catch (error) {
    if (error instanceof UserDatabaseNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: `Rebuild search failed: ${error}` });
  } finally {
    userDb?.close();
  }
});

export { router as searchRouter };
