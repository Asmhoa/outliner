import React, { useState } from "react";
import {
  ActionIcon,
  Group,
  Tabs,
  rem,
  Text,
  ScrollArea,
  Stack,
  Skeleton,
  Modal,
  TextInput,
  Button,
  ColorInput,
  Portal,
  Alert,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  addWorkspaceWorkspacesPost,
  deleteWorkspaceWorkspacesDelete,
  updateWorkspaceWorkspacesPut,
  type Workspace,
} from "../../api-client";
import { IconPlus } from "@tabler/icons-react";
import log from "../../utils/logger";

interface WorkspaceSidebarProps {
  workspaces: Workspace[];
  setWorkspaces: (ws: Workspace[]) => void;
  activeWorkspaceId: number;
  setActiveWorkspaceId: (id: number) => void;
}

const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  workspaces,
  setWorkspaces,
  activeWorkspaceId,
  setActiveWorkspaceId,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const activeWorkspacePosition = workspaces.findIndex(
    (ws) => ws.workspace_id === activeWorkspaceId,
  );
  const NAME_DISPLAY_LENGTH = 10;

  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspaceColor, setNewWorkspaceColor] = useState("");
  const [
    createModalOpened,
    { open: openCreateModal, close: closeCreateModal },
  ] = useDisclosure(false);

  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(
    null,
  );
  const [editWorkspaceName, setEditWorkspaceName] = useState("");
  const [editWorkspaceColor, setEditWorkspaceColor] = useState("#FBBC05");
  const [editModalOpened, { open: openEditModal, close: closeEditModal }] =
    useDisclosure(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (activeWorkspaceId === null) {
    // data hasn't loaded yet
    // On data load, activeWorkspaceId is set to default Workspace
    return (
      <>
        <Skeleton height={50} width="100%" />
      </>
    );
  }

  const handleSelectWorkspace = (tabValuePosition: string | null): void => {
    // <Tabs> reads the value of the <Tab> and sends the value
    // The value in our case is the Position in the workspaces array, but as a string
    if (tabValuePosition !== null) {
      console.log("called");
      const changeToWorkspaceId =
        workspaces[parseInt(tabValuePosition)].workspace_id;
      setActiveWorkspaceId(changeToWorkspaceId);
    }
  };

  const handleCreateWorkspace = () => {
    addWorkspaceWorkspacesPost({
      body: {
        name: newWorkspaceName,
        color: newWorkspaceColor,
      },
    }).then((newWs) => {
      const newWorkspace = newWs.data as Workspace;
      log.debug("New workspace added:", newWorkspace);
      setWorkspaces([workspaces[0], newWorkspace, ...workspaces.splice(1)]);
      close();
      setNewWorkspaceName("");
      // setNewWorkspaceColor("");
    });
  };

  const handleUpdateWorkspaceSubmit = () => {
    if (editingWorkspace) {
      updateWorkspaceWorkspacesPut({
        body: {
          workspace_id: editingWorkspace.workspace_id,
          new_name: editWorkspaceName,
          new_color: editWorkspaceColor,
        },
      })
        .then(() => {
          log.debug("Workspace updated");
          const ws = workspaces.find(
            (ws) => ws.workspace_id === editingWorkspace.workspace_id,
          ) as Workspace;
          ws.name = editWorkspaceName;
          ws.color = editWorkspaceColor;
          closeEditModal();
          setEditingWorkspace(null);
          setEditWorkspaceName("");
          // setEditWorkspaceColor("#FBBC05");
        })
        .catch((error) => {
          log.error("Error updating workspace:", error);
        });
    }
  };

  const handleDeleteWorkspace = () => {
    if (editingWorkspace) {
      deleteWorkspaceWorkspacesDelete({
        body: {
          workspace_id: editingWorkspace.workspace_id,
        },
      })
        .then(() => {
          log.debug("Workspace deleted");
          // Remove the deleted workspace from the list
          const updatedWorkspaces = workspaces.filter(
            (ws) => ws.workspace_id !== editingWorkspace.workspace_id,
          );
          setWorkspaces(updatedWorkspaces);

          // If the deleted workspace was the active one, switch to the first workspace
          if (editingWorkspace.workspace_id === activeWorkspaceId) {
            if (updatedWorkspaces.length > 0) {
              setActiveWorkspaceId(updatedWorkspaces[0].workspace_id);
            }
          }

          closeEditModal();
          setEditingWorkspace(null);
          setDeleteConfirmation(false);
          setDeleteError(null);
        })
        .catch((error) => {
          log.error("Error deleting workspace:", error);
          setDeleteError("Failed to delete workspace. Please try again.");
        });
    }
  };

  return (
    <Stack gap={0}>
      <Modal
        opened={createModalOpened}
        onClose={closeCreateModal}
        title="Create New Workspace"
        centered
        styles={{
          inner: {
            left: 0,
          },
        }}
      >
        <TextInput
          label="Workspace Name"
          placeholder="Enter workspace name"
          value={newWorkspaceName}
          onChange={(event) => setNewWorkspaceName(event.currentTarget.value)}
        />
        <ColorInput
          label="Workspace Color"
          value={newWorkspaceColor}
          onChange={setNewWorkspaceColor}
          format="hex"
          withEyeDropper={false}
          swatches={[
            "#25262b",
            "#868e96",
            "#fa5252",
            "#e64980",
            "#be4bdb",
            "#7950f2",
            "#4c6ef5",
            "#228be6",
            "#15aabf",
            "#12b886",
            "#40c057",
            "#82c91e",
            "#fab005",
            "#fd7e14",
          ]}
        />
        <Button onClick={handleCreateWorkspace} mt="md">
          Create Workspace
        </Button>
      </Modal>
      <Modal
        opened={editModalOpened}
        onClose={closeEditModal}
        title="Edit Workspace"
        centered
        styles={{
          inner: {
            left: 0,
          },
        }}
      >
        <TextInput
          label="Workspace Name"
          placeholder="Enter workspace name"
          value={editWorkspaceName}
          onChange={(event) => setEditWorkspaceName(event.currentTarget.value)}
        />
        <ColorInput
          label="Workspace Color"
          value={editWorkspaceColor}
          onChange={setEditWorkspaceColor}
          format="hex"
          withEyeDropper={false}
          swatches={[
            "#25262b",
            "#868e96",
            "#fa5252",
            "#e64980",
            "#be4bdb",
            "#7950f2",
            "#4c6ef5",
            "#228be6",
            "#15aabf",
            "#12b886",
            "#40c057",
            "#82c91e",
            "#fab005",
            "#fd7e14",
          ]}
        />
        <Group>
          <Button onClick={handleUpdateWorkspaceSubmit} mt="md">
            Update Workspace
          </Button>
          {deleteError && (
            <Alert title="Error" color="red" mt="md">
              {deleteError}
            </Alert>
          )}
          {editingWorkspace?.workspace_id !== 0 && !deleteConfirmation ? (
            <Button
              onClick={() => setDeleteConfirmation(true)}
              mt="md"
              color="red"
              variant="outline"
            >
              Delete Workspace
            </Button>
          ) : (
            editingWorkspace?.workspace_id !== 0 && (
              <Group mt="md">
                <Button onClick={handleDeleteWorkspace} color="red">
                  Confirm Delete
                </Button>
                <Button
                  onClick={() => setDeleteConfirmation(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
              </Group>
            )
          )}
        </Group>
        {deleteConfirmation && (
          <Alert title="Warning" color="yellow" mt="md">
            This action cannot be undone. All pages and content in this
            workspace will be permanently deleted.
          </Alert>
        )}
      </Modal>
      <ActionIcon
        w="100%"
        size="xl"
        variant="default"
        radius="0"
        onClick={openCreateModal}
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
        onChange={handleSelectWorkspace}
        loop={false}
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
                onDoubleClick={() => {
                  setEditingWorkspace(workspace);
                  setEditWorkspaceName(workspace.name);
                  setEditWorkspaceColor(workspace.color);
                  openEditModal();
                }}
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
