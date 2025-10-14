import { Stack, Tabs, Text, rem } from "@mantine/core";
import React from "react";
import { IconFolder } from "@tabler/icons-react";

interface Workspace {
  id: string;
  name: string;
  color: string; // For tab color
}

interface WorkspaceSidebarProps {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  onWorkspaceClick: (id: string) => void;
}

const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  workspaces,
  activeWorkspaceId,
  onWorkspaceClick,
}) => {
  return (
    <Tabs
      color="orange"
      variant="pills"
      orientation="vertical"
      value={activeWorkspaceId}
      onChange={onWorkspaceClick}
    >
      <Tabs.List>
        {workspaces.map((workspace) => (
          <Tabs.Tab
            key={workspace.id}
            value={workspace.id}
            h={rem(100)}
            w={rem(10)}
            style={{
              clipPath: "polygon(0 100%, 0 30%, 100% 0, 100% 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text size="xs" style={{ transform: "rotate(-90deg)" }}>
              {workspace.name.substring(0, 3)}
            </Text>
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs>
  );
};

export default WorkspaceSidebar;
