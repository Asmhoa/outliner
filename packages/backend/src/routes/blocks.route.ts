import { Router, Request, Response } from 'express';
import { SystemDatabase } from '../database/system';
import { UserDatabase } from '../database/user';
import { BlockNotFoundError, UserDatabaseNotFoundError } from '../database/errors';
import {
  BlockCreate,
  BlockUpdateContent,
  BlockUpdateParent,
  BlockUpdatePosition,
  BlockResponse
} from '../models/api-types';

const router: Router = Router();

// POST /api/blocks - Create a new block
router.post('/', (req: Request, res: Response) => {
  let sysDb: SystemDatabase | null = null;
  let userDb: UserDatabase | null = null;
  try {
    const { db_id } = req.params;
    const { content, position, type = 'text', page_id, parent_block_id } = req.body as BlockCreate;

    // Validate request body
    if (!content || position === undefined || !page_id) {
      return res.status(400).json({ error: 'Content, position, and page_id are required' });
    }

    sysDb = new SystemDatabase(process.env.SYSTEM_DB_PATH || 'system.db');
    const dbInfo = sysDb.getUserDatabaseById(db_id);
    userDb = new UserDatabase(dbInfo.path);

    const pageIdNum = parseInt(page_id, 10);
    const parentIdNum = parent_block_id ? parseInt(parent_block_id, 10) : undefined;

    const blockId = userDb.addBlock(content, position, type, pageIdNum, parentIdNum);
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
    if (error instanceof UserDatabaseNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create block' });
  } finally {
    userDb?.close();
    sysDb?.close();
  }
});

// GET /api/blocks - Get all blocks for a page
router.get('/', (req: Request, res: Response) => {
  let sysDb: SystemDatabase | null = null;
  let userDb: UserDatabase | null = null;
  try {
    const { db_id } = req.params;
    const { page_id } = req.query;

    if (!page_id) {
      return res.status(400).json({ error: 'page_id query parameter is required' });
    }

    sysDb = new SystemDatabase(process.env.SYSTEM_DB_PATH || 'system.db');
    const dbInfo = sysDb.getUserDatabaseById(db_id);
    userDb = new UserDatabase(dbInfo.path);

    const pageIdNum = parseInt(page_id as string, 10);
    const blocks = userDb.getBlocksByPageId(pageIdNum);

    res.json(blocks.map(block => ({
      block_id: block.id,
      content: block.content,
      page_id: block.page_id,
      parent_block_id: block.parent_block_id,
      position: block.position,
      type: block.type,
      created_at: block.created_at.toISOString()
    })));
  } catch (error) {
    if (error instanceof UserDatabaseNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to retrieve blocks' });
  } finally {
    userDb?.close();
    sysDb?.close();
  }
});

// GET /api/blocks/:blockId - Get a specific block
router.get('/:blockId', (req: Request, res: Response) => {
  let sysDb: SystemDatabase | null = null;
  let userDb: UserDatabase | null = null;
  try {
    const { db_id, blockId } = req.params;

    sysDb = new SystemDatabase(process.env.SYSTEM_DB_PATH || 'system.db');
    const dbInfo = sysDb.getUserDatabaseById(db_id);
    userDb = new UserDatabase(dbInfo.path);

    const blockIdNum = parseInt(blockId, 10);
    const block = userDb.getBlockById(blockIdNum);

    res.json({
      block_id: block.id,
      content: block.content,
      page_id: block.page_id,
      parent_block_id: block.parent_block_id,
      position: block.position,
      type: block.type,
      created_at: block.created_at.toISOString()
    });
  } catch (error) {
    if (error instanceof BlockNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    if (error instanceof UserDatabaseNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to retrieve block' });
  } finally {
    userDb?.close();
    sysDb?.close();
  }
});

// PUT /api/blocks/:blockId - Update a block's content
router.put('/:blockId/content', (req: Request, res: Response) => {
  let sysDb: SystemDatabase | null = null;
  let userDb: UserDatabase | null = null;
  try {
    const { db_id, blockId } = req.params;
    const { new_content } = req.body as BlockUpdateContent;

    if (!new_content) {
      return res.status(400).json({ error: 'New content is required' });
    }

    sysDb = new SystemDatabase(process.env.SYSTEM_DB_PATH || 'system.db');
    const dbInfo = sysDb.getUserDatabaseById(db_id);
    userDb = new UserDatabase(dbInfo.path);

    const blockIdNum = parseInt(blockId, 10);
    // Check block existence (this will throw BlockNotFoundError if not found)
    userDb.getBlockById(blockIdNum);
    const success = userDb.updateBlockContent(blockIdNum, new_content);

    res.json({ message: 'Block content updated successfully' });
  } catch (error) {
    if (error instanceof BlockNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    if (error instanceof UserDatabaseNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update block content' });
  } finally {
    userDb?.close();
    sysDb?.close();
  }
});

// PUT /api/blocks/:blockId/parent - Update a block's parent
router.put('/:blockId/parent', (req: Request, res: Response) => {
  let sysDb: SystemDatabase | null = null;
  let userDb: UserDatabase | null = null;
  try {
    const { db_id, blockId } = req.params;
    const { new_page_id, new_parent_block_id } = req.body as BlockUpdateParent;

    sysDb = new SystemDatabase(process.env.SYSTEM_DB_PATH || 'system.db');
    const dbInfo = sysDb.getUserDatabaseById(db_id);
    userDb = new UserDatabase(dbInfo.path);

    const blockIdNum = parseInt(blockId, 10);
    const newPageIdNum = new_page_id ? parseInt(new_page_id, 10) : undefined;
    const newParentBlockIdNum = new_parent_block_id ? parseInt(new_parent_block_id, 10) : undefined;

    // Check block existence (this will throw BlockNotFoundError if not found)
    userDb.getBlockById(blockIdNum);
    const success = userDb.updateBlockParent(blockIdNum, newPageIdNum, newParentBlockIdNum);

    res.json({ message: 'Block parent updated successfully' });
  } catch (error) {
    if (error instanceof BlockNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    if (error instanceof UserDatabaseNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update block parent' });
  } finally {
    userDb?.close();
    sysDb?.close();
  }
});

// PUT /api/blocks/:blockId/position - Update a block's position
router.put('/:blockId/position', (req: Request, res: Response) => {
  let sysDb: SystemDatabase | null = null;
  let userDb: UserDatabase | null = null;
  try {
    const { db_id, blockId } = req.params;
    const { new_position, new_parent_block_id } = req.body as BlockUpdatePosition;

    if (new_position === undefined) {
      return res.status(400).json({ error: 'New position is required' });
    }

    sysDb = new SystemDatabase(process.env.SYSTEM_DB_PATH || 'system.db');
    const dbInfo = sysDb.getUserDatabaseById(db_id);
    userDb = new UserDatabase(dbInfo.path);

    const blockIdNum = parseInt(blockId, 10);
    const newParentBlockIdNum = new_parent_block_id ? parseInt(new_parent_block_id, 10) : undefined;

    // Check block existence (this will throw BlockNotFoundError if not found)
    userDb.getBlockById(blockIdNum);
    const success = userDb.updateBlockPosition(blockIdNum, new_position, newParentBlockIdNum);

    res.json({ message: 'Block position updated successfully' });
  } catch (error) {
    if (error instanceof BlockNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    if (error instanceof UserDatabaseNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update block position' });
  } finally {
    userDb?.close();
    sysDb?.close();
  }
});

// DELETE /api/blocks/:blockId - Delete a block
router.delete('/:blockId', (req: Request, res: Response) => {
  let sysDb: SystemDatabase | null = null;
  let userDb: UserDatabase | null = null;
  try {
    const { db_id, blockId } = req.params;

    sysDb = new SystemDatabase(process.env.SYSTEM_DB_PATH || 'system.db');
    const dbInfo = sysDb.getUserDatabaseById(db_id);
    userDb = new UserDatabase(dbInfo.path);

    const blockIdNum = parseInt(blockId, 10);
    // Check block existence (this will throw BlockNotFoundError if not found)
    userDb.getBlockById(blockIdNum);
    const success = userDb.deleteBlock(blockIdNum);

    res.json({ message: 'Block deleted successfully' });
  } catch (error) {
    if (error instanceof BlockNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    if (error instanceof UserDatabaseNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete block' });
  } finally {
    userDb?.close();
    sysDb?.close();
  }
});

export { router as blocksRouter };