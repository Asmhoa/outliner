import React, { useState, useEffect } from 'react';
import Block from './Block';

interface PageProps {
  title: string;
  blocks: string[];
}

const Page: React.FC<PageProps> = ({ title, blocks }) => {
  const [pageTitle, setPageTitle] = useState(title);

  useEffect(() => {
    setPageTitle(title);
  }, [title]);

  const handleTitleBlur = (event: React.FocusEvent<HTMLHeadingElement>) => {
    const newTitle = event.currentTarget.textContent || '';
    setPageTitle(newTitle);
    console.log('New title:', newTitle);
  };

  return (
    <div className="page">
      <h1 contentEditable onBlur={handleTitleBlur} suppressContentEditableWarning>
        {pageTitle}
      </h1>
      {blocks.map((blockContent, index) => (
        <Block key={index} content={blockContent} />
      ))}
    </div>
  );
};

export default Page;
