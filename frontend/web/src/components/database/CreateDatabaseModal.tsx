import { useState, useEffect } from "react";
import { Modal, TextInput, Button, Group } from "@mantine/core";
import { createDatabaseDatabasesPost } from "../../api-client";
import log from "../../utils/logger";

interface CreateDatabaseModalProps {
  opened: boolean;
  onClose: () => void;
  onDatabaseCreated: (newDbId?: string) => void;
}

export function CreateDatabaseModal({
  opened,
  onClose,
  onDatabaseCreated,
}: CreateDatabaseModalProps) {
  const [dbName, setDbName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateDatabase = async () => {
    const trimmedDbName = dbName.trim();
    if (!trimmedDbName) return; // Prevent creating database with empty name
    
    setLoading(true);

    const { data, error } = await createDatabaseDatabasesPost({
      body: { name: trimmedDbName },
    });
    setLoading(false);

    if (error) {
      log.error("Failed to create database:", error);
      // You might want to show an error message to the user
    } else {
      log.info("Database created successfully:", data);
      // Extract the new database ID from the response and pass it to the callback
      const newDbId = data?.id;
      onDatabaseCreated(newDbId);
      onClose();
    }
  };

  const isCreateDisabled = !dbName.trim() || loading;

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" && !isCreateDisabled) {
      handleCreateDatabase();
    } else if (event.key === "Escape") {
      onClose();
    }
  };

  useEffect(() => {
    if (opened) {
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [opened, isCreateDisabled]); // Include isCreateDisabled in dependency array

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Create a new database"
      styles={{
        inner: {
          left: 0,
          alignItems: "center",
        },
      }}
    >
      <TextInput
        label="Database Name"
        placeholder="Enter a name for your new database"
        value={dbName}
        onChange={(event) => setDbName(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !isCreateDisabled) {
            event.preventDefault(); // Prevent form submission if there's a form
            handleCreateDatabase();
          }
        }}
        required
        autoFocus
      />
      <Group justify="flex-end" mt="md">
        <Button onClick={onClose} variant="default">
          Cancel
        </Button>
        <Button onClick={handleCreateDatabase} loading={loading} disabled={isCreateDisabled}>
          Create
        </Button>
      </Group>
    </Modal>
  );
}
