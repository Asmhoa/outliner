import { AppShell, LoadingOverlay } from "@mantine/core";
import { LoadingOverlayWrapper } from "./components/common/LoadingOverlayWrapper";
import { showNotification } from "@mantine/notifications";

import { useDisclosure } from "@mantine/hooks";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import log from "./utils/logger";

import "./App.css";
import Page from "./components/page/Page";
import AllPages from "./components/page/AllPages";
import RightSidebar from "./components/sidebar/RightSidebar";
import {
  getBlocksDbDbIdBlocksPageIdGet,
  addBlockDbDbIdBlocksPost,
  type Block,
  type HTTPError,
} from "./api-client";
import HeaderToolbar from "./components/sidebar/HeaderToolbar";
import LeftSidebar from "./components/sidebar/LeftSidebar";
import { useDatabase } from "./hooks/useDatabase";
import { CreateDatabaseModal } from "./components/database/CreateDatabaseModal";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { usePageData } from "./hooks/usePageData";
import { useDatabaseManager } from "./hooks/useDatabaseManager";
import { useLocation } from "react-router-dom";
import CommandPalette from "./components/search/CommandPalette";
import { useKeyboardShortcut } from "./hooks/useKeyboardShortcut";

type NavbarVisibility = "visible" | "workspace-collapsed" | "sidebar-collapsed";

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { dbId: dbIdParam, pageId } = useParams<{
    dbId: string;
    pageId: string;
  }>(); // get page_id from URL
  const { dbId, setDbId } = useDatabase();

  // Check if we're on the all-pages route
  const isAllPagesRoute = location.pathname.includes('/all-pages');

  // Use the new hooks to get page and database management functionality
  const {
    pages,
    currentPageId,
    currentPageTitle,
    setCurrentPageId,
    fetchPages,
    handleAddPage: addPage,
    handleDeletePage,
    handleRenamePage: renamePage
  } = usePageData();

  const {
    databases,
    workspaces,
    setWorkspaces,
    activeWorkspaceId,
    setActiveWorkspaceId,
    fetchDatabases,
    fetchWorkspaces,
    createDatabase,
    isDatabasesLoading
  } = useDatabaseManager();

  // Blocks still need to be managed at app level for now
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [opened, { toggle }] = useDisclosure();
  const [isSwitchingDatabase, setIsSwitchingDatabase] = useState(false);

  const [isRenaming, setIsRenaming] = useState(false);
  const [createDbModalOpened, setCreateDbModalOpened] = useState(false);

  // Check if no databases exist to show welcome screen
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(false);

  // UI elements visibility
  const [navbarVisibility, setNavbarVisibility] =
    useState<NavbarVisibility>("visible");
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(true);

  // Command palette state
  const [commandPaletteOpened, { open: openCommandPalette, close: closeCommandPalette }] =
    useDisclosure(false);

  // Keyboard shortcut for command palette (CMD+K or Ctrl+K)
  useKeyboardShortcut('k', openCommandPalette, {
    // Using cmd option to handle both CMD (Mac) and Ctrl (Windows/Linux)
    cmd: true
  });

  const handleRightSidebarToggle = () => {
    setRightSidebarCollapsed(!rightSidebarCollapsed);
  };

  const handleLeftSidebarToggle = () => {
    setNavbarVisibility((current) => {
      if (current === "visible") {
        return "workspace-collapsed";
      }
      if (current === "workspace-collapsed") {
        return "sidebar-collapsed";
      }
      return "visible";
    });
  };

  // Fetch blocks when current page changes
  useEffect(() => {
    if (!dbId || !currentPageId || isAllPagesRoute) return;

    const fetchBlocks = async () => {
      log.debug(`[App] Fetching blocks for page`, { page_id: currentPageId });
      const { data, error } = await getBlocksDbDbIdBlocksPageIdGet({
        path: { db_id: dbId, page_id: currentPageId },
      });

      if (error) {
        log.error("[App] Failed to fetch blocks:", error);
        return;
      }

      if (data) {
        if (data.length === 0) {
          log.debug(`[App] No blocks found, creating new block for page`, {
            page_id: currentPageId,
          });
          const { data: newBlock, error: newBlockError } =
            await addBlockDbDbIdBlocksPost({
              path: { db_id: dbId },
              body: { page_id: currentPageId, content: "", position: 0, type: "text" },
            });

          if (newBlockError) {
            log.error("[App] Failed to create new block:", newBlockError);
            return;
          }

          if (newBlock) {
            setBlocks([newBlock]);
          }
        } else {
          log.debug(`[App] Fetched blocks`, {
            count: data.length,
            page_id: currentPageId,
          });
          setBlocks(data);
        }
      }
    };

    fetchBlocks();
  }, [currentPageId, dbId, isAllPagesRoute]);

  // Handle database parameter changes
  useEffect(() => {
    if (dbIdParam) {
      if (dbIdParam !== dbId) {
        setIsSwitchingDatabase(true);
      }
      setDbId(dbIdParam);
    }
  }, [dbIdParam, dbId, setDbId]);

  // Update everything on DB change
  useEffect(() => {
    if (dbId) {
      log.debug(`[App] dbId changed to ${dbId}, re-fetching data`);
      const fetchData = async () => {
        await fetchWorkspaces();
        await fetchPages();
        setIsSwitchingDatabase(false);
      };
      fetchData();
    }
  }, [dbId, fetchWorkspaces, fetchPages]);

  // Check database status for welcome screen
  useEffect(() => {
    if (databases.length === 0 && !isDatabasesLoading) {
      setShowWelcomeScreen(true);
    } else if (databases.length > 0) {
      setShowWelcomeScreen(false);
      if (!dbId && dbIdParam) {
        setDbId(dbIdParam);
      } else if (!dbId) {
        setDbId(databases[0].value);
      }
    }
  }, [databases, dbId, dbIdParam, setDbId, isDatabasesLoading]);

  // Update current page ID based on URL parameter
  useEffect(() => {
    if (isAllPagesRoute) {
      // If we're on the all pages route, don't set a current page
      setCurrentPageId(null);
    } else if (pageId) {
      // Check if the page exists in our pages list before setting it as current
      const pageExists = pages.some((page) => page.page_id === pageId);
      if (pageExists) {
        setCurrentPageId(pageId);
      } else {
        setCurrentPageId(null);
        log.error(`Page with ID ${pageId} does not exist`);
        // Leave currentPageId as null, so nothing is displayed
      }
    } else {
      // Don't automatically select the first page when switching databases
      // Show no pages until the user explicitly selects one
      setCurrentPageId(null);
    }
  }, [pageId, pages, setCurrentPageId, isAllPagesRoute]);

  // Show loading overlay while checking databases initially
  if (isDatabasesLoading) {
    return (
      <LoadingOverlayWrapper
        visible={true}
        overlayProps={{ radius: "sm", blur: 2, zIndex: 1000 }}
        boxProps={{ pos: "relative" }}
      />
    );
  }

  if (showWelcomeScreen) {
    return <WelcomeScreen onDatabaseCreated={fetchDatabases} />;
  }

  if (!dbId) {
    return (
      <CreateDatabaseModal
        opened={createDbModalOpened}
        onClose={() => setCreateDbModalOpened(false)}
        onDatabaseCreated={fetchDatabases}
      />
    );
  }

  return (
    <LoadingOverlayWrapper
      visible={isSwitchingDatabase}
      overlayProps={{ radius: "sm", blur: 2, zIndex: 1000 }}
      boxProps={{ pos: "relative" }}
    >
      <AppShell
        header={{
          height: 30 + 2 * 10, // div + top and bottom padding
        }}
        navbar={{
          width: navbarVisibility === "workspace-collapsed" ? 240 : 290, // each tab has width 40 + 10 padding. TODO: move to a constant
          breakpoint: "sm",
          collapsed: {
            mobile: !opened,
            desktop: navbarVisibility === "sidebar-collapsed",
          },
        }}
        aside={{
          width: 300,
          breakpoint: "sm",
          collapsed: {
            mobile: rightSidebarCollapsed,
            desktop: rightSidebarCollapsed,
          },
        }}
        padding="md"
      >
        <AppShell.Header bd={"none"}>
          <HeaderToolbar
            onAddPage={addPage}
            navbarVisibility={navbarVisibility}
            onLeftSidebarToggle={handleLeftSidebarToggle}
            rightSidebarCollapsed={rightSidebarCollapsed}
            onRightSidebarToggle={handleRightSidebarToggle}
          />
        </AppShell.Header>
        <LeftSidebar
          pages={pages}
          currentPageId={currentPageId}
          setCurrentPageId={setCurrentPageId}
          navbarVisibility={navbarVisibility}
          workspaces={workspaces}
          setWorkspaces={setWorkspaces}
          activeWorkspaceId={activeWorkspaceId}
          setActiveWorkspaceId={setActiveWorkspaceId}
          databases={databases}
          onDatabaseCreated={fetchDatabases}
        />
        <AppShell.Main>
          {isAllPagesRoute ? (
            <AllPages pages={pages} />
          ) : currentPageId ? (
            <Page
              key={currentPageId}
              page_id={currentPageId}
              title={currentPageTitle}
              blocks={blocks}
              isRenaming={isRenaming}
              setIsRenaming={setIsRenaming}
              handleDeletePage={handleDeletePage}
              handleRenamePage={() => setIsRenaming(true)}
            />
          ) : null}
        </AppShell.Main>
        <AppShell.Aside p="md" pt={0}>
          <RightSidebar onClose={handleRightSidebarToggle} />
        </AppShell.Aside>
      </AppShell>
      <CommandPalette opened={commandPaletteOpened} onClose={closeCommandPalette} />
    </LoadingOverlayWrapper>
  );
}
export default App;
