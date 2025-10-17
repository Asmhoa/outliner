import React from "react";
import { Group, Tabs, rem, Text, ScrollArea } from "@mantine/core";

interface Workspace {
  id: string;
  name: string;
  color: string;
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
    <Group gap="xs">
      <Tabs
        variant="unstyled"
        orientation="vertical"
        value={activeWorkspaceId}
        onChange={onWorkspaceClick}
      >
        <ScrollArea h="100vh" type="never">
          <Tabs.List>
            {workspaces.map((workspace, index) => (
              <Tabs.Tab
                key={workspace.id}
                value={workspace.id}
                h={rem(120)}
                w={rem(40)}
                style={{
                  background: workspace.color,
                  // clipPath: "polygon(0 15%, 100% 0, 100% 100%, 0 85%)",
                  boxShadow: (() => {
                    const unselected =
                      index === parseInt(activeWorkspaceId)
                        ? ""
                        : "inset -2px 0 2px rgba(0,0,0,0.3), ";
                    switch (index) {
                      case 0:
                        return unselected + "0px 5px 0px rgba(0,0,0,0.3)";
                      case workspaces.length - 1:
                        return unselected + "0px -3px 0px rgba(0,0,0,0.3)";
                      default:
                        return (
                          unselected +
                          "0px 5px 0px rgba(0,0,0,0.3), 0px -3px 0px rgba(0,0,0,0.3)"
                        );
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
                  outline: "none",
                  opacity: parseInt(activeWorkspaceId) === index ? "1" : "0.5",
                }}
              >
                <Text style={{ transform: "rotate(-90deg)" }}>
                  {workspace.name.substring(0, 3)}
                </Text>
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </ScrollArea>
        <div
          style={{
            width: "10px",
            backgroundColor: workspaces[activeWorkspaceId].color,
            // opacity: 0.8,
          }}
        ></div>
      </Tabs>
    </Group>
  );
};

export default WorkspaceSidebar;
