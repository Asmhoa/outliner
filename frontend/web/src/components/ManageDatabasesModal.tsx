import { useState } from "react";
import {
  Modal,
  Button,
  Group,
  Text,
  Stack,
  ActionIcon,
  TextInput,
  Box,
} from "@mantine/core";
import { IconPencil, IconTrash, IconX, IconCheck } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import {
  getDatabasesDatabasesGet,
  updateDatabaseDatabasesDbIdPut,
  deleteDatabaseDatabasesDbIdDelete
} from "../api-client";

interface Database {
  id: string;
  name: string;
}

interface ManageDatabasesModalProps {
  opened: boolean;
  onClose: () => void;
  onDatabaseChange?: () => void; // Callback to notify parent of database changes
}

export function ManageDatabasesModal({
  opened,
  onClose,
  onDatabaseChange,
}: ManageDatabasesModalProps) {
  const [databases, setDatabases] = useState<Database[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [renamingDbId, setRenamingDbId] = useState<string | null>(null); // Track which db is being renamed
  const [deletingDbId, setDeletingDbId] = useState<string | null>(null); // Track which db is being deleted

  // Load databases when modal opens
  const loadData = async () => {
    setLoading(true);
    try {
      const response = await getDatabasesDatabasesGet();
      if (response.data) {
        setDatabases(response.data as Database[]);
      }
    } catch (error) {
      console.error("Failed to load databases:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle modal opened state
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(
    false,
    {
      onOpen: () => {
        loadData();
      },
      onClose: () => {
        setDatabases([]);
        onClose();
      },
    },
  );

  // Update modalOpened based on the parent opened prop
  if (opened && !modalOpened) {
    openModal();
  } else if (!opened && modalOpened) {
    closeModal();
  }

  const handleEditClick = (db: Database) => {
    setEditingId(db.id);
    setEditValue(db.name);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    setRenamingDbId(editingId); // Set loading state

    try {
      // Call the backend API to update the database name
      await updateDatabaseDatabasesDbIdPut({
        path: { db_id: editingId },
        body: { name: editValue }
      });

      // Update the local state after successful API call
      setDatabases((prev) =>
        prev.map((db) =>
          db.id === editingId ? { ...db, name: editValue } : db
        )
      );

      // Notify parent component to refresh the database list
      if (onDatabaseChange) {
        onDatabaseChange();
      }
    } catch (error) {
      console.error('Failed to update database name:', error);
      // Optionally show an error notification here
    } finally {
      setRenamingDbId(null); // Reset loading state
    }

    setEditingId(null);
    setEditValue("");
  };

  const handleDelete = async (dbId: string) => {
    setDeletingDbId(dbId); // Set loading state

    try {
      // Call the backend API to delete the database
      await deleteDatabaseDatabasesDbIdDelete({
        path: { db_id: dbId }
      });

      // Update the local state after successful API call
      setDatabases((prev) => prev.filter((db) => db.id !== dbId));

      // Notify parent component to refresh the database list
      if (onDatabaseChange) {
        onDatabaseChange();
      }
    } catch (error) {
      console.error('Failed to delete database:', error);
      // Optionally show an error notification here
    } finally {
      setDeletingDbId(null); // Reset loading state
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  return (
    <Modal
      opened={modalOpened}
      onClose={onClose}
      title="Manage Databases"
      size="lg"
      styles={{
        inner: {
          left: 0,
          alignItems: "center",
        },
      }}
    >
      <Stack gap="sm">
        {databases.length === 0 ? (
          <Text c="dimmed" ta="center" py="md">
            {loading ? "Loading databases..." : "No databases found"}
          </Text>
        ) : (
          databases.map((db) => (
            <Box key={db.id} py={4}>
              {editingId === db.id ? (
                <Group align="center" gap="xs">
                  <div style={{ paddingLeft: "16px", flex: 1 }}>
                    <TextInput
                      value={editValue}
                      onChange={(e) => setEditValue(e.currentTarget.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleSaveEdit();
                        } else if (e.key === "Escape") {
                          handleCancelEdit();
                        }
                      }}
                      flex={1}
                      size="sm" // Smaller input
                      autoFocus
                    />
                  </div>
                  <ActionIcon color="green" size="sm" onClick={handleSaveEdit}>
                    <IconCheck size={14} />
                  </ActionIcon>
                  <ActionIcon color="gray" size="sm" onClick={handleCancelEdit}>
                    <IconX size={14} />
                  </ActionIcon>
                </Group>
              ) : (
                <Group justify="space-between" align="center">
                  <Text size="sm" style={{ paddingLeft: "16px", wordBreak: "break-word" }}>
                    {db.name}
                  </Text>
                  <Group gap="xs">
                    <Button
                      variant="subtle"
                      size="compact-sm"
                      onClick={() => handleEditClick(db)}
                      loading={renamingDbId === db.id}
                    >
                      Rename
                    </Button>
                    <Button
                      variant="subtle"
                      color="red"
                      size="compact-sm"
                      onClick={() => handleDelete(db.id)}
                      loading={deletingDbId === db.id}
                    >
                      Delete
                    </Button>
                  </Group>
                </Group>
              )}
            </Box>
          ))
        )}
      </Stack>
    </Modal>
  );
}
