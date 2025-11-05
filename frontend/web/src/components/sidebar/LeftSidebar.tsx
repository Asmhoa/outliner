import {
  AppShell,
  Divider,
  NavLink,
  Group,
  Stack,
  Title,
  Menu,
  Button,
  Text,
  useMantineTheme,
} from "@mantine/core";
import {
  IconDatabase,
  IconLayoutDashboard,
  IconGitFork,
  IconPaperclip,
  IconStar,
  IconLayoutGrid,
  IconNote,
  IconPlus,
  IconChevronDown,
} from "@tabler/icons-react";
import WorkspaceSidebar from "./WorkspaceSidebar";
import type { Page as PageType } from "../../api-client";
import log from "../../utils/logger";
import { useNavigate } from "react-router-dom";
import { useDisclosure } from "@mantine/hooks";
import { CreateDatabaseModal } from "../CreateDatabaseModal";
import { useDatabase } from "../../hooks/useDatabase";

interface Workspace {
  workspace_id: number;
  name: string;
  color: string; // For tab color
}

interface LeftSidebarProps {
  pages: PageType[];
  currentPageId: string | null;
  setCurrentPageId: (id: string) => void;
  navbarVisibility: "visible" | "workspace-collapsed" | "sidebar-collapsed";
  workspaces: Workspace[];
  setWorkspaces: (ws: Workspace[]) => void;
  activeWorkspaceId: number | null;
  setActiveWorkspaceId: (id: number) => void;
  databases: { value: string; label: string }[];
  onDatabaseCreated: () => void;
}

const LeftSidebar = ({
  pages,
  currentPageId,
  setCurrentPageId,
  navbarVisibility,
  workspaces,
  setWorkspaces,
  activeWorkspaceId,
  setActiveWorkspaceId,
  databases,
  onDatabaseCreated,
}: LeftSidebarProps) => {
  // const activeWorkspace = workspaces.find((ws) => ws.id === activeWorkspaceId);
  // const backgroundColor = activeWorkspace ? activeWorkspace.color : "white";
  //
  const navigate = useNavigate();
  const { dbId } = useDatabase();
  const theme = useMantineTheme();
  const [
    createDbModalOpened,
    { open: openCreateDbModal, close: closeCreateDbModal },
  ] = useDisclosure(false);

  return (
    // <AppShell.Navbar pt="sm" pb="sm" style={{ backgroundColor }}>
    <AppShell.Navbar data-testid="left-sidebar">
      <Group align="flex-start" gap={0}>
        {navbarVisibility === "visible" && (
          <WorkspaceSidebar
            workspaces={workspaces}
            setWorkspaces={setWorkspaces}
            activeWorkspaceId={activeWorkspaceId}
            setActiveWorkspaceId={setActiveWorkspaceId}
          />
        )}
        <Stack pl={"md"}>
          <AppShell.Section>
            <Menu shadow="md">
              <Menu.Target>
                <Button
                  rightSection={<IconChevronDown size={16} />}
                  leftSection={<IconDatabase size={16} />}
                  variant="light"
                >
                  <Text>Switch database</Text>
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                {databases.map((db) => (
                  <Menu.Item
                    key={db.value}
                    onClick={() => navigate(`/db/${db.value}`)}
                    bg={
                      db.value === dbId ? theme.primaryColor : "transparent"
                    }
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
          </AppShell.Section>
          <CreateDatabaseModal
            opened={createDbModalOpened}
            onClose={closeCreateDbModal}
            onDatabaseCreated={() => {
              onDatabaseCreated();
              closeCreateDbModal();
            }}
          />
          <Divider />
          <AppShell.Section>
            <NavLink
              label="All Pages"
              leftSection={<IconLayoutDashboard />}
              onClick={() => log.debug("[LeftSidebar] All Pages clicked")}
            />
            <NavLink
              label="Graph View"
              leftSection={<IconGitFork />}
              onClick={() => log.debug("[LeftSidebar] Graph View clicked")}
            />
            <NavLink
              label="Assets"
              leftSection={<IconPaperclip />}
              onClick={() => log.debug("[LeftSidebar] Assets clicked")}
            />
          </AppShell.Section>
          <Divider />
          {/*<AppShell.Section>
            <NavLink
              label="Favorites"
              leftSection={<IconStar />}
              childrenOffset={28}
            >
              <NavLink
                label="Favorite Page 1"
                onClick={() => log.debug("[LeftSidebar] Favorite Page 1 clicked")}
              />
              <NavLink
                label="Favorite Page 2"
                onClick={() => log.debug("[LeftSidebar] Favorite Page 2 clicked")}
              />
              <NavLink
                label="Favorite Page 3"
                onClick={() => log.debug("[LeftSidebar] Favorite Page 3 clicked")}
              />
            </NavLink>
          </AppShell.Section>*/}
          {/*<AppShell.Section>
            <NavLink
              label="Views"
              leftSection={<IconLayoutGrid />}
              childrenOffset={28}
            >
              <NavLink
                label="View Page 1"
                onClick={() => log.debug("[LeftSidebar] View Page 1 clicked")}
              />
              <NavLink
                label="View Page 2"
                onClick={() => log.debug("[LeftSidebar] View Page 2 clicked")}
              />
              <NavLink
                label="View Page 3"
                onClick={() => log.debug("[LeftSidebar] View Page 3 clicked")}
              />
            </NavLink>
          </AppShell.Section>*/}
          <AppShell.Section>
            <NavLink
              label="Notes"
              leftSection={<IconNote />}
              childrenOffset={28}
            >
              <NavLink
                label="Note Page 1"
                onClick={() => log.debug("[LeftSidebar] Note Page 1 clicked")}
              />
              <NavLink
                label="Note Page 2"
                onClick={() => log.debug("[LeftSidebar] Note Page 2 clicked")}
              />
              <NavLink
                label="Note Page 3"
                onClick={() => log.debug("[LeftSidebar] Note Page 3 clicked")}
              />
            </NavLink>
          </AppShell.Section>
          <AppShell.Section>
            {pages.map((page) => (
              <Text
                key={page.page_id}
                // active={page.page_id === currentPageId}
                onClick={() => {
                  navigate("/db/" + dbId + "/pages/" + page.page_id);
                  // setCurrentPageId(page.page_id);
                }}
              >
                {page.title}
              </Text>
            ))}
          </AppShell.Section>
        </Stack>
      </Group>
    </AppShell.Navbar>
  );
};

export default LeftSidebar;
