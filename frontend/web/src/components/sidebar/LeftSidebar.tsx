import {
  AppShell,
  Divider,
  Group,
  Stack,
} from "@mantine/core";
import WorkspaceSidebar from "./WorkspaceSidebar";
import type { Page as PageType } from "../../api-client";
import { useNavigate } from "react-router-dom";
import { useDatabase } from "../../hooks/useDatabase";
import DatabaseSelector from "../common/DatabaseSelector";
import NavigationPanel from "./NavigationPanel";
import PageList from "./PageList";

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
  const navigate = useNavigate();
  const { dbId } = useDatabase();

  return (
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
            <DatabaseSelector
              databases={databases}
              onDatabaseCreated={onDatabaseCreated}
            />
          </AppShell.Section>
          <NavigationPanel />
          <AppShell.Section>
            <PageList
              pages={pages}
              currentPageId={currentPageId}
            />
          </AppShell.Section>
        </Stack>
      </Group>
    </AppShell.Navbar>
  );
};

export default LeftSidebar;
