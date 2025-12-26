import React, { useState, useEffect, useRef } from 'react';
import { Group, type MantineSize } from '@mantine/core';
import { usePageData } from '../../hooks/usePageData';
import { useDatabase } from '../../hooks/useDatabase';
import log from '../../utils/logger';

interface PageHeaderProps {
  pageId: string;
  title: string;
  isRenaming: boolean;
  setIsRenaming: (isRenaming: boolean) => void;
  onRename?: () => void;
  size?: MantineSize;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  pageId,
  title,
  isRenaming,
  setIsRenaming,
  onRename,
  size = 'h1'
}) => {
  const { dbId } = useDatabase();
  const { handleRenamePage: renamePage } = usePageData();
  const [pageTitle, setPageTitle] = useState(title);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (isRenaming) {
      titleRef.current?.focus();
    }
  }, [isRenaming]);

  useEffect(() => {
    setPageTitle(title);
  }, [title]);

  const handleTitleBlur = async (event: React.FocusEvent<HTMLHeadingElement>) => {
    if (!dbId) return;
    const newTitle = event.currentTarget.textContent || "";
    setPageTitle(newTitle);
    log.debug(`[PageHeader] Updating page title`, { page_id: pageId, new_title: newTitle });

    const success = await renamePage(pageId, newTitle);

    if (!success) {
      setPageTitle(title); // Revert to the original title on error
    }
    setIsRenaming(false);
    if (onRename) {
      onRename();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  const HeadingTag = size as keyof JSX.IntrinsicElements;

  return (
    <Group justify="space-between">
      <Group>
        <HeadingTag
          ref={titleRef}
          contentEditable={isRenaming}
          onBlur={handleTitleBlur}
          onKeyDown={handleKeyDown}
          suppressContentEditableWarning
          style={{ margin: 0 }}
        >
          {pageTitle}
        </HeadingTag>
      </Group>
    </Group>
  );
};

export default PageHeader;