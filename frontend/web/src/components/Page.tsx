import React, { useState, useEffect } from "react";
import Block from "./Block";
import { renamePagePagesPut } from "../api-client/sdk.gen";
import log from "../utils/logger";

import { type Block as BlockType } from "../api-client";

interface PageProps {
  page_id: number;
  title: string;
  blocks: BlockType[];
}

const Page: React.FC<PageProps> = ({ page_id, title, blocks }) => {
  const [pageTitle, setPageTitle] = useState(title);

  useEffect(() => {
    setPageTitle(title);
  }, [title]);

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
  };

  return (
    <div className="page">
      <h1
        contentEditable
        onBlur={handleTitleBlur}
        suppressContentEditableWarning
      >
        {pageTitle}
      </h1>
      {blocks.map((block) => (
        <Block key={block.block_id} id={block.block_id} content={block.content} />
      ))}
    </div>
  );
};

export default Page;
