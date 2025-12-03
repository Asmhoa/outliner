import React from 'react';
import Block from '../Block';
import { type Block as BlockType } from '../../api-client';

interface PageContentProps {
  blocks: BlockType[];
  onNewBlock: (currentBlockId: string) => void;
  onDeleteBlock: (currentBlockId: string) => void;
  blockRefs?: React.MutableRefObject<{
    [key: string]: HTMLDivElement | null;
  }>;
  nextFocusableBlockId?: string | null;
  setEditingBlock?: (blockId: string | null) => void;
}

const PageContent: React.FC<PageContentProps> = ({
  blocks,
  onNewBlock,
  onDeleteBlock,
  blockRefs,
  nextFocusableBlockId,
  setEditingBlock
}) => {
  const focusBlock = (index: number) => {
    if (index >= 0 && index < blocks.length) {
      const blockId = blocks[index].block_id;
      if (setEditingBlock) {
        // Set the target block as the editing block
        setEditingBlock(blockId);
      }
    }
  };

  const focusPreviousBlock = (currentIndex: number) => {
    focusBlock(currentIndex - 1);
  };

  const focusNextBlock = (currentIndex: number) => {
    focusBlock(currentIndex + 1);
  };

  return (
    <div className="page-content">
      {blocks.map((block, index) => (
        <Block
          ref={blockRefs ? (el) => (blockRefs.current[block.block_id] = el) : undefined}
          key={block.block_id}
          id={block.block_id}
          content={block.content}
          type={block.type || "text"}
          position={block.position}
          parentBlockId={block.parent_block_id}
          onNewBlock={onNewBlock}
          onDeleteBlock={onDeleteBlock}
          isDeletable={blocks.length > 1}
          autoFocus={block.block_id === nextFocusableBlockId}
          blockIndex={index}
          totalBlocks={blocks.length}
          focusPreviousBlock={() => focusPreviousBlock(index)}
          focusNextBlock={() => focusNextBlock(index)}
        />
      ))}
    </div>
  );
};

export default PageContent;