import React, { useState, useEffect } from 'react';

interface BlockProps {
  content: string;
}

const Block: React.FC<BlockProps> = ({ content }) => {
  const [blockContent, setBlockContent] = useState(content);

  useEffect(() => {
    setBlockContent(content);
  }, [content]);

  const handleContentBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    const newContent = event.currentTarget.textContent || '';
    setBlockContent(newContent);
    console.log('New block content:', newContent);
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
