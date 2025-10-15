import { TextInput, Button, Group, rem } from "@mantine/core";
import {
  IconSearch,
  IconPlus,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import log from "../../utils/logger";

interface SearchBoxProps {
  onAddPage: (title: string) => void;
  navbarVisibility: "visible" | "sidebar-collapsed" | "navbar-collapsed";
  onChevronClick: () => void;
}

export default function SearchBox({
  onAddPage,
  navbarVisibility,
  onChevronClick,
}: SearchBoxProps) {
  return (
    <Group mb="sm">
      {navbarVisibility !== "navbar-collapsed" && (
        <Button onClick={onChevronClick} variant="subtle">
          <IconChevronLeft />
        </Button>
      )}
      <TextInput
        style={{ flex: 1 }}
        placeholder="Search"
        leftSection={
          <IconSearch style={{ width: rem(16), height: rem(16) }} />
        }
      />
      <Button
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
      </Button>
    </Group>
  );
}
