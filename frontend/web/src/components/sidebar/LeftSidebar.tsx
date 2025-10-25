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
import log from "../../utils/logger";
import { useNavigate } from "react-router-dom";

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
}: LeftSidebarProps) => {
  // const activeWorkspace = workspaces.find((ws) => ws.id === activeWorkspaceId);
  // const backgroundColor = activeWorkspace ? activeWorkspace.color : "white";
  //
  const navigate = useNavigate();

  return (
    // <AppShell.Navbar pt="sm" pb="sm" style={{ backgroundColor }}>
    <AppShell.Navbar pt="sm" pb="sm" data-testid="left-sidebar">
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
                  navigate("/" + page.page_id);
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
