import { useCallback } from "react";
import { showNotification } from "@mantine/notifications";
import { useDatabase } from "./useDatabase";
import { updateBlockPositionDbDbIdBlocksPositionPut, type BlockUpdatePosition } from "../api-client";

export const useBlockOperations = () => {
  const { dbId } = useDatabase();

  const copyBlockReference = useCallback((blockId: string) => {
    navigator.clipboard.writeText(`[[block:${blockId}]]`);
    showNotification({ message: "Block reference copied to clipboard" });
  }, []);

  const copyBlockUrl = useCallback((blockId: string) => {
    const blockUrl = `${window.location.origin}/block/${blockId}`;
    navigator.clipboard.writeText(blockUrl);
    showNotification({ message: "Block URL copied to clipboard" });
  }, []);

  const moveBlock = useCallback(async (blockId: string, newPosition: number) => {
    if (!dbId) return;

    // Update position in database
    const updateBody: BlockUpdatePosition = {
      block_id: blockId,
      new_position: Math.max(0, newPosition), // Ensure position is not negative
    };

    const { error } = await updateBlockPositionDbDbIdBlocksPositionPut({
      path: { db_id: dbId },
      body: updateBody
    });

    if (error) {
      showNotification({ message: "Failed to move block", color: "red" });
    } else {
      showNotification({ message: "Block moved successfully" });
    }
  }, [dbId]);

  const changeParent = useCallback(async (blockId: string, newParentId: string | null) => {
    if (!dbId) return;

    // This would use the updateBlockParent API endpoint
    // For now, just log that we'd change the parent
    console.log("Would change parent for block", blockId, "to", newParentId);
    // Implementation would go here
  }, [dbId]);

  return {
    copyBlockReference,
    copyBlockUrl,
    moveBlock,
    changeParent
  };
};