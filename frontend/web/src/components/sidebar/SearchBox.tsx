import { Button, Group, rem } from "@mantine/core";
import {
  IconPlus,
  IconChevronLeft,
  IconChevronRight,
  IconSearch,
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
      <Button onClick={onChevronClick} variant="subtle">
        {navbarVisibility === "sidebar-collapsed" ? (
          <IconChevronRight />
        ) : (
          <IconChevronLeft />
        )}
      </Button>
      <Button
        variant="subtle"
        onClick={() => console.log("Search button clicked")}
      >
        <IconSearch style={{ width: rem(16), height: rem(16) }} />
      </Button>
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
