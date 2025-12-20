import { Router, Request, Response } from 'express';
import { SystemDatabase } from '../database/system';
import { UserDatabase } from '../database/user';
import { BlockNotFoundError, UserDatabaseNotFoundError } from '../database/errors';
import {
  BlockCreate,
  BlockUpdateContent,
  BlockUpdateParent,
  BlockUpdatePosition
} from './requests';
import { Block } from '../database/entities';

const router: Router = Router();

// POST /db/{db_id}/blocks - Create a new block
router.post('/db/:db_id/blocks', (req: Request, res: Response) => {
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
    res.status(200).json({
      block_id: blockId,
      content,
      page_id: pageIdNum,
      parent_block_id: parentIdNum,
      position,
      type,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    if (error instanceof BlockNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    if (error instanceof UserDatabaseNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create block' });
  } finally {
    userDb?.close();
    sysDb?.close();
  }
});

// GET /db/{db_id}/block/{block_id} - Get a specific block
router.get('/db/:db_id/block/:block_id', (req: Request, res: Response) => {
  let sysDb: SystemDatabase | null = null;
  let userDb: UserDatabase | null = null;
  try {
    const { db_id, block_id } = req.params;

    sysDb = new SystemDatabase(process.env.SYSTEM_DB_PATH || 'system.db');
    const dbInfo = sysDb.getUserDatabaseById(db_id);
    userDb = new UserDatabase(dbInfo.path);

    const blockIdNum = parseInt(block_id, 10);
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

// GET /db/{db_id}/blocks/{page_id} - Get all blocks for a page
router.get('/db/:db_id/blocks/:page_id', (req: Request, res: Response) => {
  let sysDb: SystemDatabase | null = null;
  let userDb: UserDatabase | null = null;
  try {
    const { db_id, page_id } = req.params;

    sysDb = new SystemDatabase(process.env.SYSTEM_DB_PATH || 'system.db');
    const dbInfo = sysDb.getUserDatabaseById(db_id);
    userDb = new UserDatabase(dbInfo.path);

    const pageIdNum = parseInt(page_id, 10);
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

// PUT /db/{db_id}/blocks/content - Update a block's content
router.put('/db/:db_id/blocks/content', (req: Request, res: Response) => {
  let sysDb: SystemDatabase | null = null;
  let userDb: UserDatabase | null = null;
  try {
    const { db_id } = req.params;
    const { block_id, new_content } = req.body as BlockUpdateContent;

    if (!block_id || !new_content) {
      return res.status(400).json({ error: 'block_id and new_content are required' });
    }

    sysDb = new SystemDatabase(process.env.SYSTEM_DB_PATH || 'system.db');
    const dbInfo = sysDb.getUserDatabaseById(db_id);
    userDb = new UserDatabase(dbInfo.path);

    const blockIdNum = parseInt(block_id, 10);
    userDb.updateBlockContent(blockIdNum, new_content);

    res.json({ status: 'success' });
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

// PUT /db/{db_id}/blocks/position - Update a block's position
router.put('/db/:db_id/blocks/position', (req: Request, res: Response) => {
  let sysDb: SystemDatabase | null = null;
  let userDb: UserDatabase | null = null;
  try {
    const { db_id } = req.params;
    const { block_id, new_position, new_parent_block_id } = req.body as BlockUpdatePosition;

    if (!block_id || new_position === undefined) {
      return res.status(400).json({ error: 'block_id and new_position are required' });
    }

    sysDb = new SystemDatabase(process.env.SYSTEM_DB_PATH || 'system.db');
    const dbInfo = sysDb.getUserDatabaseById(db_id);
    userDb = new UserDatabase(dbInfo.path);

    const blockIdNum = parseInt(block_id, 10);
    const newParentBlockIdNum = new_parent_block_id ? parseInt(new_parent_block_id, 10) : undefined;

    userDb.updateBlockPosition(blockIdNum, new_position, newParentBlockIdNum);

    res.json({ status: 'success' });
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

// PUT /db/{db_id}/blocks/parent - Update a block's parent
router.put('/db/:db_id/blocks/parent', (req: Request, res: Response) => {
  let sysDb: SystemDatabase | null = null;
  let userDb: UserDatabase | null = null;
  try {
    const { db_id } = req.params;
    const { block_id, new_page_id, new_parent_block_id } = req.body as BlockUpdateParent;

    if (!block_id) {
      return res.status(400).json({ error: 'block_id is required' });
    }

    sysDb = new SystemDatabase(process.env.SYSTEM_DB_PATH || 'system.db');
    const dbInfo = sysDb.getUserDatabaseById(db_id);
    userDb = new UserDatabase(dbInfo.path);

    const blockIdNum = parseInt(block_id, 10);
    const newPageIdNum = new_page_id ? parseInt(new_page_id, 10) : undefined;
    const newParentBlockIdNum = new_parent_block_id ? parseInt(new_parent_block_id, 10) : undefined;

    userDb.updateBlockParent(blockIdNum, newPageIdNum, newParentBlockIdNum);

    res.json({ status: 'success' });
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

// DELETE /db/{db_id}/blocks/{block_id} - Delete a block
router.delete('/db/:db_id/blocks/:block_id', (req: Request, res: Response) => {
  let sysDb: SystemDatabase | null = null;
  let userDb: UserDatabase | null = null;
  try {
    const { db_id, block_id } = req.params;

    sysDb = new SystemDatabase(process.env.SYSTEM_DB_PATH || 'system.db');
    const dbInfo = sysDb.getUserDatabaseById(db_id);
    userDb = new UserDatabase(dbInfo.path);

    const blockIdNum = parseInt(block_id, 10);
    userDb.deleteBlock(blockIdNum);

    res.json({ status: 'success' });
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