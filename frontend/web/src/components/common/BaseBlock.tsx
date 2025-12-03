import React, { useState, useRef, useEffect } from "react";
import { showNotification } from "@mantine/notifications";
import { Menu } from "@mantine/core";
import { IconCopy, IconArrowsMove, IconSwitch, IconFolderPlus, IconTrash } from "@tabler/icons-react";
import { useBlockOperations } from "../../hooks/useBlockOperations";

interface BaseBlockProps {
  id: string;
  content: string;
  type: string;
  position: number;
  parentBlockId?: string | null;
  onNewBlock: (currentBlockId: string) => void;
  onDeleteBlock: (currentBlockId: string) => void;
  isDeletable: boolean;
  children: React.ReactNode;
}

const BaseBlock: React.FC<BaseBlockProps> = ({
  id,
  content,
  type,
  position,
  parentBlockId,
  onNewBlock,
  onDeleteBlock,
  isDeletable,
  children
}) => {
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const { copyBlockReference, copyBlockUrl, moveBlock, changeParent } = useBlockOperations();

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setContextMenuOpen(true);
  };

  const handleContextMenuAction = (action: string) => {
    switch(action) {
      case "copyReference":
        copyBlockReference(id);
        break;
      case "copyUrl":
        copyBlockUrl(id);
        break;
      case "moveUp":
        moveBlock(id, position - 1);
        break;
      case "moveDown":
        moveBlock(id, position + 1);
        break;
      case "changeType":
        // Show type selection UI - this will be handled in a future implementation
        console.log("Change type action for block:", id);
        break;
      case "nestBlock":
        // Show parent selection UI - this will be handled in a future implementation
        console.log("Nest block action for block:", id);
        break;
      case "delete":
        if (isDeletable) {
          onDeleteBlock(id);
        }
        break;
    }
    setContextMenuOpen(false);
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setContextMenuOpen(false);
    }
  };

  useEffect(() => {
    if (contextMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [contextMenuOpen]);

  return (
    <div
      ref={containerRef}
      className="block"
      onContextMenu={handleContextMenu}
    >
      {/* Actual block content */}
      {children}

      {/* Context menu using Mantine Menu component */}
      <Menu
        opened={contextMenuOpen}
        onChange={setContextMenuOpen}
        position="bottom-start"
        withArrow
      >
        <Menu.Target>
          <div style={{ display: 'none' }} />
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            leftSection={<IconCopy size={14} />}
            onClick={() => handleContextMenuAction("copyReference")}
          >
            Copy Reference
          </Menu.Item>
          <Menu.Item
            leftSection={<IconCopy size={14} />}
            onClick={() => handleContextMenuAction("copyUrl")}
          >
            Copy URL
          </Menu.Item>
          <Menu.Item
            leftSection={<IconFolderPlus size={14} />}
            onClick={() => handleContextMenuAction("nestBlock")}
          >
            Nest Block
          </Menu.Item>
          <Menu.Item
            leftSection={<IconArrowsMove size={14} />}
            onClick={() => handleContextMenuAction("moveUp")}
          >
            Move Up
          </Menu.Item>
          <Menu.Item
            leftSection={<IconArrowsMove size={14} />}
            onClick={() => handleContextMenuAction("moveDown")}
          >
            Move Down
          </Menu.Item>
          <Menu.Item
            leftSection={<IconSwitch size={14} />}
            onClick={() => handleContextMenuAction("changeType")}
          >
            Change Type
          </Menu.Item>
          {isDeletable && (
            <Menu.Item
              leftSection={<IconTrash size={14} />}
              color="red"
              onClick={() => handleContextMenuAction("delete")}
            >
              Delete
            </Menu.Item>
          )}
        </Menu.Dropdown>
      </Menu>
    </div>
  );
};

export default BaseBlock;