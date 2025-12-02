import React, { useState, useEffect, useRef } from "react";
import { updateBlockContentDbDbIdBlocksContentPut, type BlockUpdateContent } from "../api-client";
import log from "../utils/logger";
import { useDatabase } from "../hooks/useDatabase";

interface TextBlockProps {
  id: string;
  content: string;
  type: string;
  onContentChange: (id: string, newContent: string) => void;
  onNewBlock?: (currentBlockId: string) => void;
  onDeleteBlock?: (currentBlockId: string) => void;
  isDeletable?: boolean;
}

const TextBlock: React.FC<TextBlockProps> = ({
  id,
  content,
  onContentChange,
  onNewBlock,
  onDeleteBlock,
  isDeletable = true
}) => {
  const [blockContent, setBlockContent] = useState(content);
  const editableDivRef = useRef<HTMLDivElement>(null);
  const { dbId } = useDatabase();

  useEffect(() => {
    setBlockContent(content);
  }, [content]);

  const handleContentChange = async () => {
    if (!dbId) {
      log.error("[TextBlock] No database ID available");
      return;
    }

    const newContent = editableDivRef.current?.textContent || "";
    setBlockContent(newContent);

    log.debug(`[TextBlock] Updating content`, { block_id: id, new_content: newContent });

    const updatedBlock: BlockUpdateContent = {
      block_id: id,
      new_content: newContent,
    };

    const { error } = await updateBlockContentDbDbIdBlocksContentPut({
      path: { db_id: dbId },
      body: updatedBlock
    });

    if (error) {
      log.error("[TextBlock] Failed to update block content:", error);
      setBlockContent(content); // Revert on error
    } else {
      onContentChange(id, newContent);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      log.debug(`[TextBlock] Enter pressed, creating new block`, { block_id: id });
      onNewBlock?.(id);
    } else if (
      event.key === "Backspace" &&
      editableDivRef.current?.textContent === "" &&
      isDeletable
    ) {
      event.preventDefault();
      log.debug(`[TextBlock] Backspace on empty block, deleting`, { block_id: id });
      onDeleteBlock?.(id);
    }
  };

  return (
    <div
      ref={editableDivRef}
      contentEditable
      onBlur={handleContentChange}
      onKeyDown={handleKeyDown}
      suppressContentEditableWarning
      className="editable-block"
    >
      {blockContent}
    </div>
  );
};

export default TextBlock;