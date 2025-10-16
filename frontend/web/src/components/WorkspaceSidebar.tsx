import React from "react";
import { Stack, Tabs, rem, Text } from "@mantine/core";

interface Workspace {
  id: string;
  name: string;
}

interface WorkspaceSidebarProps {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  onWorkspaceClick: (id: string) => void;
}

const tabColors = ["#4285F4", "#34A853", "#FBBC05", "#EA4335"];

const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  workspaces,
  activeWorkspaceId,
  onWorkspaceClick,
}) => {
  return (
    <Stack>
      <Tabs
        variant="unstyled"
        orientation="vertical"
        value={activeWorkspaceId}
        onChange={onWorkspaceClick}
      >
        <Tabs.List>
          {workspaces.map((workspace, index) => (
            <Tabs.Tab
              key={workspace.id}
              value={workspace.id}
              h={rem(120)}
              w={rem(40)}
              style={{
                background: `${tabColors[index % tabColors.length]}`,
                // clipPath: "polygon(0 15%, 100% 0, 100% 100%, 0 85%)",
                boxShadow: (() => {
                  switch (index) {
                    case 0:
                      return "0px 5px 2px rgba(0,0,0,0.3)";
                    case workspaces.length - 1:
                      return "0px -3px 2px rgba(0,0,0,0.3)";
                    default:
                      return "0px 5px 2px rgba(0,0,0,0.3), 0px -3px 2px rgba(0,0,0,0.3)";
                  }
                })(),
                borderRadius: "10px 0 0 10px",
                marginTop: index === 0 ? 0 : rem(-40),
                position: "relative",
                zIndex:
                  workspaces.length -
                  Math.abs(parseInt(activeWorkspaceId) - index),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
              }}
            >
              <Text style={{ transform: "rotate(-90deg)" }}>
                {workspace.name.substring(0, 3)}
              </Text>
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>
    </Stack>
  );
};

export default WorkspaceSidebar;
