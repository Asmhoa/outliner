import { useState } from "react";
import { Modal, TextInput, Button, Group } from "@mantine/core";
import { createDatabaseDatabasesPost } from "../api-client";
import log from "../utils/logger";

interface CreateDatabaseModalProps {
  opened: boolean;
  onClose: () => void;
  onDatabaseCreated: () => void;
}

export function CreateDatabaseModal({
  opened,
  onClose,
  onDatabaseCreated,
}: CreateDatabaseModalProps) {
  const [dbName, setDbName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateDatabase = async () => {
    setLoading(true);

    const { data, error } = await createDatabaseDatabasesPost({
      body: { name: dbName },
    });
    setLoading(false);

    if (error) {
      log.error("Failed to create database:", error);
      // You might want to show an error message to the user
    } else {
      log.info("Database created successfully:", data);
      onDatabaseCreated();
      onClose();
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Create a new database"
      styles={{
        inner: {
          left: 0,
        },
      }}
    >
      <TextInput
        label="Database Name"
        placeholder="Enter a name for your new database"
        value={dbName}
        onChange={(event) => setDbName(event.currentTarget.value)}
        required
      />
      <Group justify="flex-end" mt="md">
        <Button onClick={onClose} variant="default">
          Cancel
        </Button>
        <Button onClick={handleCreateDatabase} loading={loading}>
          Create
        </Button>
      </Group>
    </Modal>
  );
}
