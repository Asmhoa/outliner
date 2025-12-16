import { Router, Request, Response } from 'express';
import { DatabaseService, UserDatabaseService } from '../services';
import { BlockNotFoundError } from '../database/errors';
import {
  BlockCreate,
  BlockUpdateContent,
  BlockUpdateParent,
  BlockUpdatePosition
} from '../types/global';

const router = Router();

// POST /api/blocks - Create a new block
router.post('/', (req: Request, res: Response) => {
  let dbService: DatabaseService | null = null;
  let userDbService: UserDatabaseService | null = null;
  try {
    const { db_id } = req.params;
    const { content, position, type = 'text', page_id, parent_block_id } = req.body as BlockCreate;

    // Validate request body
    if (!content || position === undefined || !page_id) {
      return res.status(400).json({ error: 'Content, position, and page_id are required' });
    }

    dbService = new DatabaseService(process.env.SYSTEM_DB_PATH || 'system.db');
    userDbService = dbService.getUserDatabaseService(db_id);

    const pageIdNum = parseInt(page_id, 10);
    const parentIdNum = parent_block_id ? parseInt(parent_block_id, 10) : undefined;

    const blockId = userDbService.addBlock(content, position, type, pageIdNum, parentIdNum);
    res.status(201).json({
      block_id: blockId,
      content,
      page_id: pageIdNum,
      parent_block_id: parentIdNum,
      position,
      type,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create block' });
  } finally {
    userDbService?.close();
    dbService?.close();
  }
});

// GET /api/blocks - Get all blocks for a page
router.get('/', (req: Request, res: Response) => {
  let dbService: DatabaseService | null = null;
  let userDbService: UserDatabaseService | null = null;
  try {
    const { db_id } = req.params;
    const { page_id } = req.query;

    if (!page_id) {
      return res.status(400).json({ error: 'page_id query parameter is required' });
    }

    dbService = new DatabaseService(process.env.SYSTEM_DB_PATH || 'system.db');
    userDbService = dbService.getUserDatabaseService(db_id);

    const pageIdNum = parseInt(page_id as string, 10);
    const blocks = userDbService.getBlocksByPageId(pageIdNum);

    res.json(blocks.map(block => ({
      block_id: block.id,
      content: block.content,
      page_id: block.pageId,
      parent_block_id: block.parentBlockId,
      position: block.position,
      type: block.type,
      created_at: block.createdAt.toISOString()
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve blocks' });
  } finally {
    userDbService?.close();
    dbService?.close();
  }
});

// GET /api/blocks/:blockId - Get a specific block
router.get('/:blockId', (req: Request, res: Response) => {
  let dbService: DatabaseService | null = null;
  let userDbService: UserDatabaseService | null = null;
  try {
    const { db_id, blockId } = req.params;

    dbService = new DatabaseService(process.env.SYSTEM_DB_PATH || 'system.db');
    userDbService = dbService.getUserDatabaseService(db_id);

    const blockIdNum = parseInt(blockId, 10);
    const block = userDbService.getBlockById(blockIdNum);

    res.json({
      block_id: block.id,
      content: block.content,
      page_id: block.pageId,
      parent_block_id: block.parentBlockId,
      position: block.position,
      type: block.type,
      created_at: block.createdAt.toISOString()
    });
  } catch (error) {
    if (error instanceof BlockNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to retrieve block' });
  } finally {
    userDbService?.close();
    dbService?.close();
  }
});

// PUT /api/blocks/:blockId - Update a block's content
router.put('/:blockId/content', (req: Request, res: Response) => {
  let dbService: DatabaseService | null = null;
  let userDbService: UserDatabaseService | null = null;
  try {
    const { db_id, blockId } = req.params;
    const { new_content } = req.body as BlockUpdateContent;

    if (!new_content) {
      return res.status(400).json({ error: 'New content is required' });
    }

    dbService = new DatabaseService(process.env.SYSTEM_DB_PATH || 'system.db');
    userDbService = dbService.getUserDatabaseService(db_id);

    const blockIdNum = parseInt(blockId, 10);
    const success = userDbService.updateBlockContent(blockIdNum, new_content);

    res.json({ message: 'Block content updated successfully' });
  } catch (error) {
    if (error instanceof BlockNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update block content' });
  } finally {
    userDbService?.close();
    dbService?.close();
  }
});

// PUT /api/blocks/:blockId/parent - Update a block's parent
router.put('/:blockId/parent', (req: Request, res: Response) => {
  let dbService: DatabaseService | null = null;
  let userDbService: UserDatabaseService | null = null;
  try {
    const { db_id, blockId } = req.params;
    const { new_page_id, new_parent_block_id } = req.body as BlockUpdateParent;

    dbService = new DatabaseService(process.env.SYSTEM_DB_PATH || 'system.db');
    userDbService = dbService.getUserDatabaseService(db_id);

    const blockIdNum = parseInt(blockId, 10);
    const newPageIdNum = new_page_id ? parseInt(new_page_id, 10) : undefined;
    const newParentBlockIdNum = new_parent_block_id ? parseInt(new_parent_block_id, 10) : undefined;

    const success = userDbService.updateBlockParent(blockIdNum, newPageIdNum, newParentBlockIdNum);

    res.json({ message: 'Block parent updated successfully' });
  } catch (error) {
    if (error instanceof BlockNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update block parent' });
  } finally {
    userDbService?.close();
    dbService?.close();
  }
});

// PUT /api/blocks/:blockId/position - Update a block's position
router.put('/:blockId/position', (req: Request, res: Response) => {
  let dbService: DatabaseService | null = null;
  let userDbService: UserDatabaseService | null = null;
  try {
    const { db_id, blockId } = req.params;
    const { new_position, new_parent_block_id } = req.body as BlockUpdatePosition;

    if (new_position === undefined) {
      return res.status(400).json({ error: 'New position is required' });
    }

    dbService = new DatabaseService(process.env.SYSTEM_DB_PATH || 'system.db');
    userDbService = dbService.getUserDatabaseService(db_id);

    const blockIdNum = parseInt(blockId, 10);
    const newParentBlockIdNum = new_parent_block_id ? parseInt(new_parent_block_id, 10) : undefined;

    const success = userDbService.updateBlockPosition(blockIdNum, new_position, newParentBlockIdNum);

    res.json({ message: 'Block position updated successfully' });
  } catch (error) {
    if (error instanceof BlockNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update block position' });
  } finally {
    userDbService?.close();
    dbService?.close();
  }
});

// DELETE /api/blocks/:blockId - Delete a block
router.delete('/:blockId', (req: Request, res: Response) => {
  let dbService: DatabaseService | null = null;
  let userDbService: UserDatabaseService | null = null;
  try {
    const { db_id, blockId } = req.params;

    dbService = new DatabaseService(process.env.SYSTEM_DB_PATH || 'system.db');
    userDbService = dbService.getUserDatabaseService(db_id);

    const blockIdNum = parseInt(blockId, 10);
    const success = userDbService.deleteBlock(blockIdNum);

    res.json({ message: 'Block deleted successfully' });
  } catch (error) {
    if (error instanceof BlockNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete block' });
  } finally {
    userDbService?.close();
    dbService?.close();
  }
});

export { router as blocksRouter };