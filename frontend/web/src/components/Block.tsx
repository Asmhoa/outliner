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
    log.debug(`Setting block content for block_id: ${id} to "${content}"`);
    setBlockContent(content);
  }, [id, content]);

  const handleContentBlur = async (event: React.FocusEvent<HTMLDivElement>) => {
    const newContent = event.currentTarget.textContent || "";
    setBlockContent(newContent);
    log.debug(`Updating block content for block_id: ${id} to "${newContent}"`);
    try {
      const updatedBlock: BlockUpdateContent = {
        block_id: id,
        new_content: newContent,
      };
      await updateBlockContentBlocksContentPut({ body: updatedBlock });
    } catch (error) {
      log.error("Failed to update block content:", error);
      setBlockContent(content);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      log.debug(`Enter pressed on block_id: ${id}, creating new block.`);
      onNewBlock(id);
    } else if (
      event.key === "Backspace" &&
      blockContent === "" &&
      isDeletable
    ) {
      event.preventDefault();
      log.debug(`Backspace pressed on empty block_id: ${id}, deleting block.`);
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
