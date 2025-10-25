import {
  ActionIcon,
  Group,
  rem,
  Modal,
  TextInput,
  Button,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useState } from "react";
import {
  IconPencilPlus,
  IconLayoutSidebarRightExpand,
  IconLayoutSidebarLeftExpand,
  IconSearch,
} from "@tabler/icons-react";
import log from "../../utils/logger";

interface SearchBoxProps {
  onAddPage: (title: string) => void;
  navbarVisibility: "visible" | "workspace-collapsed" | "sidebar-collapsed";
  onLeftSidebarToggle: () => void;
  rightSidebarCollapsed: boolean;
  onRightSidebarToggle: () => void;
}

export default function SearchBox({
  onAddPage,
  navbarVisibility,
  onLeftSidebarToggle,
  rightSidebarCollapsed,
  onRightSidebarToggle,
}: SearchBoxProps) {
  const [newPageTitle, setNewPageTitle] = useState("");
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);

  const handleCreatePage = () => {
    if (!newPageTitle.trim()) {
      return; // Don't create a page with empty title
    }
    log.debug(`Adding new page with title: "${newPageTitle}"`);
    onAddPage(newPageTitle);
    setNewPageTitle("");
    closeModal();
  };

  return (
    <>
      <Modal
        opened={modalOpened}
        onClose={closeModal}
        title="Create New Page"
        centered
        styles={{
          inner: {
            left: 0,
          },
        }}
      >
        <TextInput
          label="Page Title"
          placeholder="Enter page title"
          value={newPageTitle}
          onChange={(event) => setNewPageTitle(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleCreatePage();
            }
          }}
          autoFocus
        />
        <Button
          onClick={handleCreatePage}
          mt="md"
          disabled={!newPageTitle.trim()}
        >
          Create Page
        </Button>
      </Modal>
      <Group p="xs" pl="md" pr="md" pt="4px" gap="xs" w="100%">
        <Group>
          <ActionIcon
            onClick={onLeftSidebarToggle}
            variant="subtle"
            data-testid="left-sidebar-toggle"
          >
            {navbarVisibility === "sidebar-collapsed" ? (
              <IconLayoutSidebarLeftExpand />
            ) : (
              <IconLayoutSidebarRightExpand />
            )}
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            onClick={() => log.debug("[SearchBox] Search button clicked")}
          >
            <IconSearch style={{ width: rem(16), height: rem(16) }} />
          </ActionIcon>
          <ActionIcon variant="subtle" onClick={openModal}>
            <IconPencilPlus style={{ width: rem(16), height: rem(16) }} />
          </ActionIcon>
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
    </>
  );
}
