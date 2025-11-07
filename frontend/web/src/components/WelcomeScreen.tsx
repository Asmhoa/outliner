import {
  Box,
  Card,
  Title,
  Text,
  Button,
  Group,
  Space,
  Container,
  Center,
} from "@mantine/core";
import { IconDatabase, IconDownload, IconBook } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { CreateDatabaseModal } from "./CreateDatabaseModal";

interface WelcomeScreenProps {
  onDatabaseCreated: () => void;
}

export function WelcomeScreen({ onDatabaseCreated }: WelcomeScreenProps) {
  const [
    createModalOpened,
    { open: openCreateModal, close: closeCreateModal },
  ] = useDisclosure(false);

  const handleDatabaseCreated = () => {
    onDatabaseCreated();
    closeCreateModal();
  };

  return (
    <>
      <Container
        size="md"
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box style={{ width: "100%", maxWidth: 600, textAlign: "center" }}>
          <Card
            shadow="sm"
            padding="xl"
            radius="lg"
            withBorder
            style={{ background: "var(--mantine-color-body)" }}
          >
            <Center style={{ marginBottom: 20 }}>
              <Box
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  backgroundColor: "var(--mantine-color-blue-light)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconDatabase
                  size={30}
                  color="var(--mantine-color-blue-filled)"
                />
              </Box>
            </Center>

            <Title
              order={1}
              style={{ marginBottom: "1rem", textAlign: "center" }}
            >
              Welcome to Outliner
            </Title>

            <Space h="xl" />

            <Group justify="center" gap="lg" grow>
              <Button
                leftSection={<IconDatabase size={20} />}
                size="lg"
                variant="filled"
                onClick={openCreateModal}
                style={{ flex: 1, maxWidth: 250 }}
              >
                New Database
              </Button>

              <Button
                leftSection={<IconDownload size={20} />}
                size="lg"
                variant="outline"
                disabled
                style={{ flex: 1, maxWidth: 250 }}
              >
                Import Database
              </Button>
            </Group>

            <Space h="lg" />

            <Group justify="center">
              <Button
                leftSection={<IconBook size={16} />}
                size="sm"
                variant="subtle"
                component="a"
                href="https://github.com/amolinasalazar/outliner"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--mantine-color-dimmed)" }}
              >
                Learn More
              </Button>
            </Group>
          </Card>
        </Box>
      </Container>

      <CreateDatabaseModal
        opened={createModalOpened}
        onClose={closeCreateModal}
        onDatabaseCreated={handleDatabaseCreated}
      />
    </>
  );
}
