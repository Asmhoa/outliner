import { ActionIcon, Group, rem } from "@mantine/core";
import {
  IconPlus,
  IconLayoutSidebarRightExpand,
  IconLayoutSidebarLeftExpand,
  IconSearch,
} from "@tabler/icons-react";
import log from "../../utils/logger";

interface SearchBoxProps {
  // onAddPage: (title: string) => void;
  navbarVisibility: "visible" | "sidebar-collapsed" | "navbar-collapsed";
  onLeftSidebarToggle: () => void;
  rightSidebarCollapsed: boolean;
  onRightSidebarToggle: () => void;
}

export default function SearchBox({
  navbarVisibility,
  onLeftSidebarToggle,
  rightSidebarCollapsed,
  onRightSidebarToggle,
}: SearchBoxProps) {
  return (
    <Group p="xs" pl="md" pr="md" pt="4px" gap="xs" w="100%">
      <Group>
        <ActionIcon onClick={onLeftSidebarToggle} variant="subtle">
          {navbarVisibility === "sidebar-collapsed" ? (
            <IconLayoutSidebarLeftExpand />
          ) : (
            <IconLayoutSidebarRightExpand />
          )}
        </ActionIcon>
        <ActionIcon
          variant="subtle"
          onClick={() => console.log("Search button clicked")}
        >
          <IconSearch style={{ width: rem(16), height: rem(16) }} />
        </ActionIcon>
        {/*<Button
        onClick={() => {
          const title = prompt("Enter page title");
          if (!title) {
            return; // User cancelled or entered empty title
          }
          log.debug(`Adding new page with title: "${title}"`);
          onAddPage(title);
        }}
      >
        <IconPlus size={16} />
      </Button>*/}
      </Group>
      <Group align="flex-end" ml="auto">
        <ActionIcon onClick={onRightSidebarToggle} variant="subtle">
          {rightSidebarCollapsed ? (
            <IconLayoutSidebarRightExpand />
          ) : (
            <IconLayoutSidebarLeftExpand />
          )}
        </ActionIcon>
      </Group>
    </Group>
  );
}
