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

interface Workspace {
  id: string;
  name: string;
  color: string; // For tab color
}

interface LeftSidebarProps {
  pages: PageType[];
  currentPageId: number | null;
  setCurrentPageId: (id: number) => void;
  toggle: () => void;
  navbarVisibility: "visible" | "workspace-collapsed" | "sidebar-collapsed";
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  onWorkspaceClick: (id: string) => void;
  databases: { value: string; label: string }[];
}

const LeftSidebar = ({
  pages,
  currentPageId,
  setCurrentPageId,
  toggle,
  navbarVisibility,
  workspaces,
  activeWorkspaceId,
  onWorkspaceClick,
  databases,
}: LeftSidebarProps) => {
  const activeWorkspace = workspaces.find((ws) => ws.id === activeWorkspaceId);
  // const backgroundColor = activeWorkspace ? activeWorkspace.color : "white";

  return (
    // <AppShell.Navbar pt="sm" pb="sm" style={{ backgroundColor }}>
    <AppShell.Navbar pt="sm" pb="sm">
      <Group align="flex-start" gap={0}>
        {navbarVisibility === "visible" && (
          <WorkspaceSidebar
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
            onWorkspaceClick={onWorkspaceClick}
          />
        )}
        <Stack pl="lg">
          <AppShell.Section>
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <Button
                  rightSection={<IconChevronDown size={14} />}
                  leftSection={<IconDatabase size={16} />}
                >
                  <Text>Switch database</Text>
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                {databases.map((db) => (
                  <Menu.Item key={db.value}>{db.label}</Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          </AppShell.Section>
          <Divider />
          <AppShell.Section>
            <NavLink
              label="All Pages"
              leftSection={<IconLayoutDashboard />}
              onClick={() => console.log("Clicked All Pages")}
            />
            <NavLink
              label="Graph View"
              leftSection={<IconGitFork />}
              onClick={() => console.log("Clicked Graph View")}
            />
            <NavLink
              label="Assets"
              leftSection={<IconPaperclip />}
              onClick={() => console.log("Clicked Assets")}
            />
          </AppShell.Section>
          <Divider />
          <AppShell.Section>
            <Group>
              <IconStar size={16} />
              <Title order={4}>Favorites</Title>
            </Group>
            <NavLink
              label="Favorite Page 1"
              onClick={() => console.log("Clicked Favorite Page 1")}
            />
            <NavLink
              label="Favorite Page 2"
              onClick={() => console.log("Clicked Favorite Page 2")}
            />
            <NavLink
              label="Favorite Page 3"
              onClick={() => console.log("Clicked Favorite Page 3")}
            />
          </AppShell.Section>
          <AppShell.Section>
            <Group>
              <IconLayoutGrid size={16} />
              <Title order={4}>Views</Title>
              <IconPlus size={16} />
            </Group>
            <NavLink
              label="View Page 1"
              onClick={() => console.log("Clicked View Page 1")}
            />
            <NavLink
              label="View Page 2"
              onClick={() => console.log("Clicked View Page 2")}
            />
            <NavLink
              label="View Page 3"
              onClick={() => console.log("Clicked View Page 3")}
            />
          </AppShell.Section>
          <AppShell.Section>
            <Group>
              <IconNote size={16} />
              <Title order={4}>Notes</Title>
              <IconPlus size={16} />
            </Group>
            <NavLink
              label="Note Page 1"
              onClick={() => console.log("Clicked Note Page 1")}
            />
            <NavLink
              label="Note Page 2"
              onClick={() => console.log("Clicked Note Page 2")}
            />
            <NavLink
              label="Note Page 3"
              onClick={() => console.log("Clicked Note Page 3")}
            />
          </AppShell.Section>
          <AppShell.Section>
            {pages.map((page) => (
              <NavLink
                key={page.page_id}
                label={page.title}
                active={page.page_id === currentPageId}
                onClick={() => {
                  setCurrentPageId(page.page_id);
                  toggle();
                }}
              />
            ))}
          </AppShell.Section>
        </Stack>
      </Group>
    </AppShell.Navbar>
  );
};

export default LeftSidebar;
