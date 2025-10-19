import React, { useState, useEffect, useRef } from "react";
import Block from "./Block";
import {
  renamePagePagesPut,
  addBlockBlocksPost,
  deleteBlockBlocksDelete,
} from "../api-client/sdk.gen";
import log from "../utils/logger";
import { Button, Group } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import PageMenu from "./PageMenu";

import { type Block as BlockType } from "../api-client";

interface PageProps {
  page_id: number;
  title: string;
  blocks: BlockType[];
  isRenaming: boolean;
  setIsRenaming: (isRenaming: boolean) => void;
  handleDeletePage: (page_id: number) => void;
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
  const [pageTitle, setPageTitle] = useState(title);
  const [blocks, setBlocks] = useState<BlockType[]>(initialBlocks);
  const blockRefs = useRef<{
    [key: number]: HTMLDivElement | null;
  }>({});
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [nextFocusableBlockId, setNextFocusableBlockId] = useState<
    number | null
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
    log.debug(`Setting page title to: "${title}"`);
    setPageTitle(title);
  }, [title]);

  useEffect(() => {
    log.debug(`Setting blocks for page_id: ${page_id}`, initialBlocks);
    setBlocks(initialBlocks);
  }, [initialBlocks, page_id]);

  const handleTitleBlur = async (
    event: React.FocusEvent<HTMLHeadingElement>,
  ) => {
    const newTitle = event.currentTarget.textContent || "";
    setPageTitle(newTitle);
    log.debug(`Updating page title for page_id: ${page_id} to "${newTitle}"`);
    try {
      await renamePagePagesPut({
        body: {
          page_id: page_id,
          new_title: newTitle,
        },
      });
    } catch (error) {
      log.error("Failed to rename page:", error);
      setPageTitle(title);
    }
    setIsRenaming(false);
  };

  const handleNewBlock = async (currentBlockId: number) => {
    log.debug(`Adding new block after block_id: ${currentBlockId}`);
    try {
      const newBlock = await addBlockBlocksPost({
        body: { page_id: page_id, content: "", position: 0 },
      });
      const currentIndex = blocks.findIndex(
        (block) => block.block_id === currentBlockId,
      );
      const newBlocks = [...blocks];
      newBlocks.splice(currentIndex + 1, 0, newBlock.data);
      setBlocks(newBlocks);
      setNextFocusableBlockId(newBlock.data.block_id);
    } catch (error) {
      log.error("Failed to add new block:", error);
    }
  };

  const handleDeleteBlock = async (currentBlockId: number) => {
    if (blocks.length > 1) {
      log.debug(`Deleting block_id: ${currentBlockId}`);
      try {
        const currentIndex = blocks.findIndex(
          (block) => block.block_id === currentBlockId,
        );
        await deleteBlockBlocksDelete({ body: { block_id: currentBlockId } });
        const newBlocks = blocks.filter(
          (block) => block.block_id !== currentBlockId,
        );
        setBlocks(newBlocks);
        if (currentIndex > 0) {
          setNextFocusableBlockId(blocks[currentIndex - 1].block_id);
        }
      } catch (error) {
        log.error("Failed to delete block:", error);
      }
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
