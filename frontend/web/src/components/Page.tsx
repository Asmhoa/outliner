import React, { useState, useEffect, useRef } from "react";
import { showNotification } from "@mantine/notifications";
import Block from "./Block";
import {
  renamePageDbDbNamePagesPut,
  addBlockDbDbNameBlocksPost,
  deleteBlockDbDbNameBlocksBlockIdDelete,
} from "../api-client/sdk.gen";
import log from "../utils/logger";
import { Group } from "@mantine/core";
import PageMenu from "./PageMenu";
import { useDatabase } from "../hooks/useDatabase";

import { type Block as BlockType, type HTTPError } from "../api-client";

interface PageProps {
  page_id: string;
  title: string;
  blocks: BlockType[];
  isRenaming: boolean;
  setIsRenaming: (isRenaming: boolean) => void;
  handleDeletePage: (page_id: string) => void;
  handleRenamePage: () => void;
}

const Page: React.FC<PageProps> = ({
  page_id,
  title,
  blocks: initialBlocks,
  isRenaming,
  setIsRenaming,
  handleDeletePage,
  handleRenamePage,
}) => {
  const { dbName } = useDatabase();
  const [pageTitle, setPageTitle] = useState(title);
  const [blocks, setBlocks] = useState<BlockType[]>(initialBlocks);
  const blockRefs = useRef<{
    [key: string]: HTMLDivElement | null;
  }>({});
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [nextFocusableBlockId, setNextFocusableBlockId] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (isRenaming) {
      titleRef.current?.focus();
    }
  }, [isRenaming]);

  useEffect(() => {
    if (nextFocusableBlockId) {
      const blockToFocus = blockRefs.current[nextFocusableBlockId];
      if (blockToFocus) {
        blockToFocus.focus();
      }
      setNextFocusableBlockId(null);
    }
  }, [nextFocusableBlockId]);

  useEffect(() => {
    log.debug(`[Page] Setting page title`, { title });
    setPageTitle(title);
  }, [title]);

  useEffect(() => {
    log.debug(`[Page] Setting blocks`, { page_id, count: initialBlocks.length });
    setBlocks(initialBlocks);
  }, [initialBlocks, page_id]);

  const handleTitleBlur = async (
    event: React.FocusEvent<HTMLHeadingElement>,
  ) => {
    if (!dbName) return;
    const newTitle = event.currentTarget.textContent || "";
    setPageTitle(newTitle);
    log.debug(`[Page] Updating page title`, { page_id, new_title: newTitle });

    const { error, response } = await renamePageDbDbNamePagesPut({
      path: { db_name: dbName },
      body: {
        page_id: page_id,
        new_title: newTitle,
      },
    });

    if (error) {
      if (response.status === 409) {
        const httpError = error as HTTPError;
        const errorMessage =
          (httpError.body as { detail: string }).detail ||
          "A page with this title already exists.";
        log.error(errorMessage);
        showNotification({
          title: "Failed to rename page",
          message: errorMessage,
          color: "red",
        });
      } else {
        log.error("[Page] Failed to rename page:", error);
      }
      setPageTitle(title); // Revert to the original title on error
    }
    setIsRenaming(false);
  };

  const handleNewBlock = async (currentBlockId: string) => {
    if (!dbName) return;
    log.debug(`[Page] Adding new block`, {
      page_id,
      current_block_id: currentBlockId,
    });
    const { data: newBlock, error } = await addBlockDbDbNameBlocksPost({
      path: { db_name: dbName },
      body: { page_id: page_id, content: "", position: 0 },
    });

    if (error) {
      log.error("[Page] Failed to add new block:", error);
      return;
    }

    if (newBlock) {
      const currentIndex = blocks.findIndex(
        (block) => block.block_id === currentBlockId,
      );
      const newBlocks = [...blocks];
      newBlocks.splice(currentIndex + 1, 0, newBlock);
      setBlocks(newBlocks);
      setNextFocusableBlockId(newBlock.block_id);
    }
  };

  const handleDeleteBlock = async (currentBlockId: string) => {
    if (blocks.length <= 1 || !dbName) return;

    log.debug(`[Page] Deleting block`, { block_id: currentBlockId, page_id });
    const { error } = await deleteBlockDbDbNameBlocksBlockIdDelete({
      path: { db_name: dbName, block_id: currentBlockId },
    });

    if (error) {
      log.error("[Page] Failed to delete block:", error);
      return;
    }

    const currentIndex = blocks.findIndex(
      (block) => block.block_id === currentBlockId,
    );
    const newBlocks = blocks.filter(
      (block) => block.block_id !== currentBlockId,
    );
    setBlocks(newBlocks);
    if (currentIndex > 0) {
      setNextFocusableBlockId(blocks[currentIndex - 1].block_id);
    }
  };

  return (
    <div className="page" style={{ paddingTop: 0 }}>
      <Group justify="space-between">
        <Group>
          <h1
            ref={titleRef}
            contentEditable={isRenaming}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
            suppressContentEditableWarning
          >
            {pageTitle}
          </h1>
        </Group>
        <Group>
          <PageMenu
            onDelete={() => {
              if (page_id) {
                handleDeletePage(page_id);
              }
            }}
            onRename={handleRenamePage}
          />
        </Group>
      </Group>
      {blocks.map((block) => (
        <Block
          ref={(el) => (blockRefs.current[block.block_id] = el)}
          key={block.block_id}
          id={block.block_id}
          content={block.content}
          onNewBlock={handleNewBlock}
          onDeleteBlock={handleDeleteBlock}
          isDeletable={blocks.length > 1}
        />
      ))}
    </div>
  );
};

export default Page;
