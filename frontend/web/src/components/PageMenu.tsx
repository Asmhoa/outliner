import { Menu, ActionIcon } from "@mantine/core";
import { IconDots } from "@tabler/icons-react";

interface PageMenuProps {
  onDelete: () => void;
  onRename: () => void;
}

const PageMenu: React.FC<PageMenuProps> = ({ onDelete, onRename }) => {
  return (
    <Menu shadow="md" width={200}>
      <Menu.Target>
        <ActionIcon variant="subtle">
          <IconDots />
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Item
          onClick={onRename}
        >
          Rename page
        </Menu.Item>
        <Menu.Item
          onClick={onDelete}
        >
          Delete page
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};

export default PageMenu;