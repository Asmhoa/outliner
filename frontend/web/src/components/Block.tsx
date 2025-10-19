import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import {
  updateBlockContentBlocksContentPut,
  type BlockUpdateContent,
} from "../api-client";
import log from "../utils/logger";

interface BlockProps {
  id: number;
  content: string;
  onNewBlock: (currentBlockId: number) => void;
  onDeleteBlock: (currentBlockId: number) => void;
  isDeletable: boolean;
}

const Block = forwardRef<HTMLDivElement, BlockProps>(({ id, content, onNewBlock, onDeleteBlock, isDeletable }, ref) => {
  const [blockContent, setBlockContent] = useState(content);
  const editableDivRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => editableDivRef.current as HTMLDivElement);

  useEffect(() => {
    log.debug(`[Block] Setting content`, { block_id: id, content });
    setBlockContent(content);
  }, [id, content]);

  const handleContentBlur = async (event: React.FocusEvent<HTMLDivElement>) => {
    const newContent = event.currentTarget.textContent || "";
    setBlockContent(newContent);
    log.debug(`[Block] Updating content`, { block_id: id, new_content: newContent });
    try {
      const updatedBlock: BlockUpdateContent = {
        block_id: id,
        new_content: newContent,
      };
      await updateBlockContentBlocksContentPut({ body: updatedBlock });
    } catch (error) {
      log.error("[Block] Failed to update block content:", error);
      setBlockContent(content);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      log.debug(`[Block] Enter pressed, creating new block`, { block_id: id });
      onNewBlock(id);
    } else if (
      event.key === "Backspace" &&
      blockContent === "" &&
      isDeletable
    ) {
      event.preventDefault();
      log.debug(`[Block] Backspace on empty block, deleting`, { block_id: id });
      onDeleteBlock(id);
    }
  };

  return (
    <div className="block">
      <span className="bullet">•</span>
      <div
        ref={editableDivRef}
        contentEditable
        onBlur={handleContentBlur}
        onKeyDown={handleKeyDown}
        suppressContentEditableWarning
        className="editable-block"
      >
        {blockContent}
      </div>
    </div>
  );
});

export default Block;
