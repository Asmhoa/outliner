import { useCallback } from "react";
import { showNotification } from "@mantine/notifications";
import { useDatabase } from "./useDatabase";
import apiService from "../services";
import { type BlockUpdatePosition } from "../api-client";

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
    const { error } = await apiService.updateBlockPosition(dbId, blockId, Math.max(0, newPosition));

    if (error) {
      showNotification({ message: "Failed to move block", color: "red" });
    } else {
      showNotification({ message: "Block moved successfully" });
    }
  }, [dbId]);

  const changeParent = useCallback(async (blockId: string, newParentId: string | null) => {
    if (!dbId) return;

    const { error } = await apiService.updateBlockParent(dbId, blockId, newParentId);

    if (error) {
      showNotification({ message: "Failed to change block parent", color: "red" });
    } else {
      showNotification({ message: "Block parent changed successfully" });
    }
  }, [dbId]);

  return {
    copyBlockReference,
    copyBlockUrl,
    moveBlock,
    changeParent
  };
};