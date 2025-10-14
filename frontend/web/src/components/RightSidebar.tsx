import React from "react";
import { Stack, Title, Text } from "@mantine/core";

const RightSidebar: React.FC = () => {
  return (
    <Stack p="md">
      <Title order={4}>Right Sidebar</Title>
      <Text>This is the right sidebar content.</Text>
      {/* Add more content here later */}
    </Stack>
  );
};

export default RightSidebar;
