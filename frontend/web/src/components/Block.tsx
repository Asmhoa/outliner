import React, { forwardRef, useImperativeHandle, useRef } from "react";
import BaseBlock from "./common/BaseBlock";
import TextBlock from "./TextBlock";
import log from "../utils/logger";

interface BlockProps {
  id: string;
  content: string;
  type: string;
  position: number;
  parentBlockId?: string | null;
  onNewBlock: (currentBlockId: string) => void;
  onDeleteBlock: (currentBlockId: string) => void;
  isDeletable: boolean;
}

const Block = forwardRef<HTMLDivElement, BlockProps>(({
  id,
  content,
  type = "text", // default to text type
  position,
  parentBlockId,
  onNewBlock,
  onDeleteBlock,
  isDeletable
}, ref) => {
  const blockRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => blockRef.current as HTMLDivElement);

  const handleContentChange = (blockId: string, newContent: string) => {
    log.debug(`[Block] Content changed`, { block_id: blockId, new_content: newContent });
    // Content is already saved via TextBlock, this is just a callback if needed
  };

  const renderBlockType = () => {
    switch (type) {
      case "text":
      default:
        return (
          <TextBlock
            id={id}
            content={content}
            type={type}
            onContentChange={handleContentChange}
            onNewBlock={onNewBlock}
            onDeleteBlock={onDeleteBlock}
            isDeletable={isDeletable}
          />
        );
    }
  };

  return (
    <BaseBlock
      id={id}
      content={content}
      type={type}
      position={position}
      parentBlockId={parentBlockId}
      onNewBlock={onNewBlock}
      onDeleteBlock={onDeleteBlock}
      isDeletable={isDeletable}
    >
      <span className="bullet">•</span>
      {renderBlockType()}
    </BaseBlock>
  );
});

export default Block;
