import React from "react";
import { Stack, Title, Text, Group, ActionIcon } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";

interface RightSidebarProps {
  onClose: () => void;
}

const RightSidebar: React.FC<RightSidebarProps> = ({ onClose }) => {
  return (
    <Stack>
      <Group justify="space-between">
        <Title order={4}>Right Sidebar</Title>
        <ActionIcon onClick={onClose} variant="subtle">
          <IconChevronRight />
        </ActionIcon>
      </Group>
      <Text>This is the right sidebar content.</Text>
      {/* Add more content here later */}
    </Stack>
  );
};

export default RightSidebar;
