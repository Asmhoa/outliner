import React, { useState, useEffect } from "react";
import {
  ActionIcon,
  Group,
  Tabs,
  rem,
  Text,
  ScrollArea,
  Stack,
  Skeleton,
} from "@mantine/core";
import { addWorkspaceWorkspacesPost, type Workspace } from "../../api-client";
import { IconPlus } from "@tabler/icons-react";
import log from "../../utils/logger";

interface WorkspaceSidebarProps {
  workspaces: Workspace[];
  handleAddNewWorkspace: (newWorkspace: Workspace) => void;
  activeWorkspaceId: number;
  setActiveWorkspaceId: (id: number) => void;
}

const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  workspaces,
  handleAddNewWorkspace,
  activeWorkspaceId,
  setActiveWorkspaceId,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const activeWorkspacePosition = workspaces.findIndex(
    (ws) => ws.workspace_id === activeWorkspaceId,
  );
  const NAME_DISPLAY_LENGTH = 10;

  if (activeWorkspaceId === null) {
    // data hasn't loaded yet
    // On data load, activeWorkspaceId is set to default Workspace
    return (
      <>
        <Skeleton height={50} width="100%" />
      </>
    );
  }

  const handleNewWorkspace = () => {
    addWorkspaceWorkspacesPost({
      body: {
        name: "test",
        color: "#FBBC05",
      },
    }).then((newWorkspace) => {
      log.debug("New workspace added:", newWorkspace.data);
      handleAddNewWorkspace(newWorkspace.data as Workspace);
    });
  };

  return (
    <Stack gap={0}>
      <ActionIcon
        w="100%"
        size="xl"
        variant="default"
        radius="0"
        onClick={handleNewWorkspace}
        style={{
          boxShadow: "inset -2px 1px 4px rgba(0,0,0,0.3)",
        }}
      >
        <IconPlus />
      </ActionIcon>
      <Tabs
        variant="unstyled"
        orientation="vertical"
        // value={activeWorkspaceId}
        // onChange={onWorkspaceClick}
      >
        <ScrollArea h="100vh" type="never">
          <Tabs.List>
            {workspaces.map((workspace, index) => (
              <Tabs.Tab
                key={index}
                value={index.toString()}
                h={rem(120)}
                w={rem(40)}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{
                  background: workspace.color,
                  boxShadow: (() => {
                    const unselected =
                      index === activeWorkspacePosition
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
                        Math.abs(activeWorkspacePosition - index),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  outline: "none",
                  opacity:
                    activeWorkspacePosition === index || hoveredIndex === index
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
                    if (workspace.name.length > NAME_DISPLAY_LENGTH) {
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
                          workspace.name.substring(0, NAME_DISPLAY_LENGTH - 3) +
                          "..."
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
            backgroundColor: workspaces[activeWorkspacePosition].color,
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
