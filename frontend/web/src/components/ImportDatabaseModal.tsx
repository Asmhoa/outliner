import { useState } from "react";
import { Modal, TextInput, Button, Group, FileInput, Alert } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import log from "../utils/logger";

interface ImportDatabaseModalProps {
  opened: boolean;
  onClose: () => void;
  onDatabaseImported?: () => void;
}

export function ImportDatabaseModal({ opened, onClose, onDatabaseImported }: ImportDatabaseModalProps) {
  const [dbName, setDbName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImportDatabase = async () => {
    if (!dbName.trim()) {
      setError("Please enter a name for your database");
      return;
    }

    if (!selectedFile) {
      setError("Please select a database file to import");
      return;
    }

    // Basic validation for file type
    if (!selectedFile.name.endsWith('.db') && !selectedFile.name.endsWith('.sqlite') && !selectedFile.name.endsWith('.sqlite3')) {
      setError("Please select a valid database file (.db, .sqlite, or .sqlite3)");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('name', dbName);

      const response = await fetch('http://127.0.0.1:8000/databases/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Failed to import database');
      }

      log.info("Database imported successfully:", result);
      
      if (onDatabaseImported) {
        onDatabaseImported();
      }
      
      onClose();
    } catch (err: any) {
      log.error("Failed to import database:", err);
      setError(err.message || "Failed to import database. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Import a database"
      styles={{
        inner: {
          left: 0,
        },
      }}
    >
      <TextInput
        label="Database Name"
        placeholder="Enter a name for the imported database"
        value={dbName}
        onChange={(event) => setDbName(event.currentTarget.value)}
        required
        mb="md"
      />
      
      <FileInput
        label="Database File"
        placeholder="Select database file (.db, .sqlite, .sqlite3)"
        value={selectedFile}
        onChange={setSelectedFile}
        required
        mb="md"
      />
      
      {error && (
        <Alert 
          icon={<IconAlertCircle size={16} />} 
          title="Error" 
          color="red" 
          mb="md"
        >
          {error}
        </Alert>
      )}
      
      <Text size="sm" color="dimmed" mb="md">
        Select a database file to import. Currently supports .db, .sqlite, and .sqlite3 files.
      </Text>
      
      <Group justify="flex-end" mt="md">
        <Button onClick={onClose} variant="default">
          Cancel
        </Button>
        <Button onClick={handleImportDatabase} loading={loading}>
          Import
        </Button>
      </Group>
    </Modal>
  );
}