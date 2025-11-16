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
}

const PageContent: React.FC<PageContentProps> = ({
  blocks,
  onNewBlock,
  onDeleteBlock,
  blockRefs
}) => {
  return (
    <div className="page-content">
      {blocks.map((block) => (
        <Block
          ref={blockRefs ? (el) => (blockRefs.current[block.block_id] = el) : undefined}
          key={block.block_id}
          id={block.block_id}
          content={block.content}
          onNewBlock={onNewBlock}
          onDeleteBlock={onDeleteBlock}
          isDeletable={blocks.length > 1}
        />
      ))}
    </div>
  );
};

export default PageContent;