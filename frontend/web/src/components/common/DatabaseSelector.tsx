import {
  Button,
  Menu,
  Text,
  useMantineTheme,
  Group
} from "@mantine/core";
import {
  IconDatabase,
  IconChevronDown,
  IconPlus
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { useDisclosure } from "@mantine/hooks";
import { CreateDatabaseModal } from "../CreateDatabaseModal";
import { useDatabase } from "../../hooks/useDatabase";

interface DatabaseSelectorProps {
  databases: { value: string; label: string }[];
  onDatabaseCreated: () => void;
}

const DatabaseSelector: React.FC<DatabaseSelectorProps> = ({
  databases,
  onDatabaseCreated
}) => {
  const navigate = useNavigate();
  const { dbId } = useDatabase();
  const theme = useMantineTheme();
  const currentDatabase = databases.find((db) => db.value === dbId);
  const [
    createDbModalOpened,
    { open: openCreateDbModal, close: closeCreateDbModal },
  ] = useDisclosure(false);

  return (
    <Group align="flex-start" gap={0}>
      <Menu shadow="md">
        <Menu.Target>
          <Button
            rightSection={<IconChevronDown size={16} />}
            leftSection={<IconDatabase size={16} />}
            variant="light"
            w={210}
          >
            <Text>
              {currentDatabase
                ? currentDatabase.label
                : "Switch database"}
            </Text>
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          {databases.map((db) => (
            <Menu.Item
              key={db.value}
              onClick={() => navigate(`/db/${db.value}`)}
              bg={db.value === dbId ? theme.primaryColor : "transparent"}
              c={db.value === dbId ? "white" : theme.colors.dark[9]}
            >
              {db.label}
            </Menu.Item>
          ))}
          <Menu.Divider />
          <Menu.Item
            leftSection={<IconPlus size={14} />}
            onClick={openCreateDbModal}
          >
            Create New Database
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
      <CreateDatabaseModal
        opened={createDbModalOpened}
        onClose={closeCreateDbModal}
        onDatabaseCreated={(newDbId) => {
          // If we get a new database ID, navigate to it; otherwise just call the original callback
          if (newDbId) {
            navigate(`/db/${newDbId}`);
          }
          // Always call the original callback to allow parent components to refresh their database list
          onDatabaseCreated();
          closeCreateDbModal();
        }}
      />
    </Group>
  );
};

export default DatabaseSelector;