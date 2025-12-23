import { useState, useCallback } from "react";
import { useDatabase } from "./useDatabase";
import apiService from "../services";
import {
  type Block as BlockType,
  type BlockUpdateContent
} from "../services/APIService";
import { showNotification } from "@mantine/notifications";
import log from "../utils/logger";

interface UseBlockDataReturn {
  blocks: BlockType[];
  setBlocks: React.Dispatch<React.SetStateAction<BlockType[]>>;
  handleAddBlock: (page_id: string, position?: number) => Promise<BlockType | undefined>;
  handleDeleteBlock: (block_id: string) => Promise<boolean>;
  handleUpdateBlockContent: (block_id: string, new_content: string) => Promise<boolean>;
  handleMoveBlock: (block_id: string, new_position: number) => void;
}

export const useBlockData = (): UseBlockDataReturn => {
  const { dbId } = useDatabase();
  const [blocks, setBlocks] = useState<BlockType[]>([]);

  const handleAddBlock = async (page_id: string, position: number = 0) => {
    if (!dbId) {
      log.error("[useBlockData] No database ID available");
      return undefined;
    }

    log.debug(`[useBlockData] Adding new block`, { page_id, position });
    const { data, error } = await apiService.addBlock(dbId, page_id, "", position, "text");

    if (error) {
      log.error("[useBlockData] Failed to add new block:", error);
      return undefined;
    }

    if (data) {
      setBlocks(prevBlocks => [...prevBlocks, data]);
      return data;
    }

    return undefined;
  };

  const handleDeleteBlock = async (block_id: string) => {
    if (!dbId) {
      log.error("[useBlockData] No database ID available");
      return false;
    }

    log.debug(`[useBlockData] Deleting block`, { block_id });
    const { error } = await apiService.deleteBlock(dbId, block_id);

    if (error) {
      log.error("[useBlockData] Failed to delete block:", error);
      return false;
    }

    setBlocks(prevBlocks => prevBlocks.filter(block => block.block_id !== block_id));
    return true;
  };

  const handleUpdateBlockContent = async (block_id: string, new_content: string) => {
    if (!dbId) {
      log.error("[useBlockData] No database ID available");
      return false;
    }

    log.debug(`[useBlockData] Updating block content`, { block_id, new_content });
    const { error } = await apiService.updateBlockContent(dbId, block_id, new_content);

    if (error) {
      log.error("[useBlockData] Failed to update block content:", error);
      return false;
    }

    setBlocks(prevBlocks =>
      prevBlocks.map(block =>
        block.block_id === block_id ? { ...block, content: new_content } : block
      )
    );

    return true;
  };

  const handleMoveBlock = (block_id: string, new_position: number) => {
    setBlocks(prevBlocks => {
      const blockIndex = prevBlocks.findIndex(block => block.block_id === block_id);
      if (blockIndex === -1) return prevBlocks;

      const newBlocks = [...prevBlocks];
      const [movedBlock] = newBlocks.splice(blockIndex, 1);
      newBlocks.splice(new_position, 0, movedBlock);
      
      return newBlocks;
    });
  };

  return {
    blocks,
    setBlocks,
    handleAddBlock,
    handleDeleteBlock,
    handleUpdateBlockContent,
    handleMoveBlock
  };
};