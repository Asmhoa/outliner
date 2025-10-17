import React, { useState } from "react";
import {
  ActionIcon,
  Group,
  Tabs,
  rem,
  Text,
  ScrollArea,
  Stack,
} from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";

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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const NAME_LENGTH = 10;

  return (
    <Stack gap={0}>
      <ActionIcon
        w="100%"
        size="xl"
        variant="default"
        radius="0"
        onClick={() => console.log("New workspace added")}
        style={{
          boxShadow: "inset -2px 1px 4px rgba(0,0,0,0.3)",
        }}
      >
        <IconPlus />
      </ActionIcon>
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
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{
                  background: workspace.color,
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
                    hoveredIndex === index
                      ? 100
                      : workspaces.length -
                        Math.abs(parseInt(activeWorkspaceId) - index),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  outline: "none",
                  opacity:
                    parseInt(activeWorkspaceId) === index ||
                    hoveredIndex === index
                      ? "1"
                      : "0.75",
                  overflow: "hidden",
                }}
              >
                <Text
                  style={{
                    transform: "rotate(-90deg)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    width: "100%",
                    textAlign: "center",
                  }}
                >
                  {(() => {
                    if (workspace.name.length > NAME_LENGTH) {
                      if (hoveredIndex === index) {
                        return (
                          <span
                            style={{
                              display: "inline-block",
                              animation: "scroll 3s linear infinite",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {workspace.name}
                          </span>
                        );
                      } else {
                        return (
                          workspace.name.substring(0, NAME_LENGTH - 3) + "..."
                        );
                      }
                    } else {
                      return workspace.name;
                    }
                  })()}
                </Text>
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </ScrollArea>
        <div
          style={{
            width: "10px",
            backgroundColor: workspaces[activeWorkspaceId].color,
          }}
        ></div>
      </Tabs>
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(30%); }
          100% { transform: translateX(-30%); }
        }
      `}</style>
    </Stack>
  );
};

export default WorkspaceSidebar;
