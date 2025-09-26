import React, { useState, useEffect } from 'react';
import { updateBlockContentBlocksContentPut, type BlockUpdateContent } from '../api-client';
import log from '../utils/logger';

interface BlockProps {
  id: number;
  content: string;
}

const Block: React.FC<BlockProps> = ({ id, content }) => {
  const [blockContent, setBlockContent] = useState(content);

  useEffect(() => {
    setBlockContent(content);
  }, [content]);

  const handleContentBlur = async (event: React.FocusEvent<HTMLDivElement>) => {
    const newContent = event.currentTarget.textContent || '';
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

  return (
    <div className="block">
      <span className="bullet">•</span>
      <div
        contentEditable
        onBlur={handleContentBlur}
        suppressContentEditableWarning
        className="editable-block"
      >
        {blockContent}
      </div>
    </div>
  );
};

export default Block;