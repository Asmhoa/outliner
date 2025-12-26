import { Menu, ActionIcon, Button } from "@mantine/core";
import { IconDots, IconPencil, IconTrash, IconCopy, IconShare } from "@tabler/icons-react";
import { useState } from "react";

interface PageActionsProps {
  onDelete: () => void;
  onRename: () => void;
  onDuplicate?: () => void;
  onShare?: () => void;
  variant?: 'menu' | 'buttons';
}

const PageActions: React.FC<PageActionsProps> = ({ 
  onDelete, 
  onRename, 
  onDuplicate, 
  onShare,
  variant = 'menu' 
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (variant === 'buttons') {
    return (
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button 
          variant="subtle" 
          size="compact-sm"
          leftSection={<IconPencil size={16} />}
          onClick={onRename}
        >
          Rename
        </Button>
        <Button 
          variant="subtle" 
          size="compact-sm"
          leftSection={<IconCopy size={16} />}
          onClick={onDuplicate}
          disabled={!onDuplicate}
        >
          Duplicate
        </Button>
        <Button 
          variant="subtle" 
          size="compact-sm"
          leftSection={<IconShare size={16} />}
          onClick={onShare}
          disabled={!onShare}
        >
          Share
        </Button>
        <Button 
          variant="subtle" 
          size="compact-sm"
          color="red"
          leftSection={<IconTrash size={16} />}
          onClick={confirmDelete ? onDelete : () => setConfirmDelete(true)}
        >
          {confirmDelete ? "Confirm Delete" : "Delete"}
        </Button>
      </div>
    );
  }

  return (
    <Menu shadow="md" width={200}>
      <Menu.Target>
        <ActionIcon variant="subtle" data-testid="page-menu-button">
          <IconDots />
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Item
          leftSection={<IconPencil size={14} />}
          onClick={onRename}
        >
          Rename page
        </Menu.Item>
        {onDuplicate && (
          <Menu.Item
            leftSection={<IconCopy size={14} />}
            onClick={onDuplicate}
          >
            Duplicate page
          </Menu.Item>
        )}
        {onShare && (
          <Menu.Item
            leftSection={<IconShare size={14} />}
            onClick={onShare}
          >
            Share page
          </Menu.Item>
        )}
        <Menu.Divider />
        <Menu.Item
          leftSection={<IconTrash size={14} />}
          color="red"
          onClick={confirmDelete ? onDelete : () => setConfirmDelete(true)}
        >
          {confirmDelete ? "Confirm Delete" : "Delete page"}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};

export default PageActions;