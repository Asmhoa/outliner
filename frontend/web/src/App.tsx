import { AppShell, Box, LoadingOverlay } from "@mantine/core";
import { showNotification } from "@mantine/notifications";

import { useDisclosure } from "@mantine/hooks";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import log from "./utils/logger";

import "./App.css";
import Page from "./components/Page";
import RightSidebar from "./components/sidebar/RightSidebar";
import {
  getPageDbDbIdPagesPageIdGet,
  getBlocksDbDbIdBlocksPageIdGet,
  addPageDbDbIdPagesPost,
  getPagesDbDbIdPagesGet,
  deletePageDbDbIdPagesPageIdDelete,
  addBlockDbDbIdBlocksPost,
  getWorkspacesDbDbIdWorkspacesGet,
  getDatabasesDatabasesGet,
  type Block,
  type Page as PageType,
  type Workspace,
  type HTTPError,
} from "./api-client";
import SearchBox from "./components/sidebar/SearchBox";
import LeftSidebar from "./components/sidebar/LeftSidebar";
import { useDatabase } from "./hooks/useDatabase";
import { CreateDatabaseModal } from "./components/CreateDatabaseModal";
import { WelcomeScreen } from "./components/WelcomeScreen";

type NavbarVisibility = "visible" | "workspace-collapsed" | "sidebar-collapsed";

function App() {
  const { dbId: dbIdParam, pageId } = useParams<{
    dbId: string;
    pageId: string;
  }>(); // get page_id from URL
  const { dbId, setDbId } = useDatabase();

  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [pages, setPages] = useState<PageType[]>([]);
  const [opened, { toggle }] = useDisclosure();
  const [isSwitchingDatabase, setIsSwitchingDatabase] = useState(false);

  const [isRenaming, setIsRenaming] = useState(false);
  const [createDbModalOpened, setCreateDbModalOpened] = useState(false);

  // Load things from the DB
  // Workspaces
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(
    null,
  );

  const getAllWorkspaces = useCallback(async () => {
    if (!dbId) return;
    const { data: all_workspaces, error } =
      await getWorkspacesDbDbIdWorkspacesGet({
        path: { db_id: dbId },
      });
    if (error) {
      log.error("[App] Failed to fetch workspaces:", error);
      return;
    }

    if (all_workspaces) {
      const sorted_workspaces = [
        // Structure default first then most recent
        all_workspaces[0],
        ...all_workspaces.slice(1).reverse(),
      ];
      setWorkspaces(sorted_workspaces as Workspace[]);
      if (activeWorkspaceId === null) {
        setActiveWorkspaceId(0);
      }
    }
  }, [dbId, activeWorkspaceId]);

  useEffect(() => {
    getAllWorkspaces();
  }, [getAllWorkspaces]);

  // Other
  const [databases, setDatabases] = useState<
    { value: string; label: string }[]
  >([]);

  const getAllDatabases = useCallback(async () => {
    const { data, error } = await getDatabasesDatabasesGet();
    if (error) {
      log.error("[App] Failed to fetch databases:", error);
      return;
    }
    if (data) {
      if (data.length === 0) {
        setShowWelcomeScreen(true);
        setCreateDbModalOpened(false);
      } else {
        setDatabases(data.map((db) => ({ value: db.name, label: db.name })));
        if (!dbId && dbIdParam) {
          setDbId(dbIdParam);
        } else if (!dbId) {
          setDbId(data[0].name);
        }
        setShowWelcomeScreen(false);
      }
    }
  }, [setDbId, dbIdParam]);

  useEffect(() => {
    if (dbIdParam) {
      if (dbIdParam !== dbId) {
        setPages([]);
        setCurrentPageId(null);
        setIsSwitchingDatabase(true);
      }
      setDbId(dbIdParam);
    }
  }, [dbIdParam, dbId, setDbId]);

  useEffect(() => {
    getAllDatabases();
  }, [getAllDatabases]);

  // Check if no databases exist to show welcome screen
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(false);

  // UI elements visibility
  const [navbarVisibility, setNavbarVisibility] =
    useState<NavbarVisibility>("visible");
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(true);

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

  const fetchPages = useCallback(async () => {
    if (!dbId) return;
    log.debug("[App] Fetching pages...");
    const { data, error } = await getPagesDbDbIdPagesGet({
      path: { db_id: dbId },
    });
    if (error) {
      log.error("[App] Failed to fetch pages:", error);
      return;
    }
    if (data) {
      log.debug(`[App] Fetched ${data.length} pages`);
      setPages(data);
    }
  }, [dbId]);

  const handleDeletePage = async (page_id: string) => {
    if (!dbId) return;
    log.debug(`[App] Deleting page`, { page_id });
    const { error } = await deletePageDbDbIdPagesPageIdDelete({
      path: { db_id: dbId, page_id },
    });

    if (error) {
      log.error("[App] Failed to delete page:", error);
      return;
    }

    fetchPages();
    setCurrentPageId(null);
    setTitle("");
    setBlocks([]);
  };

  const handleRenamePage = () => {
    setIsRenaming(true);
  };

  const handleAddPage = async (title: string) => {
    if (!dbId) return;
    log.debug(`[App] Adding new page`, { title });
    const { data, error, response } = await addPageDbDbIdPagesPost({
      path: { db_id: dbId },
      body: { title },
    });

    if (error) {
      if (response.status === 409) {
        const httpError = error as HTTPError;
        const errorMessage =
          (httpError.body as { detail: string }).detail ||
          "A page with this title already exists.";
        log.error(errorMessage);
        showNotification({
          title: "Failed to add page",
          message: errorMessage,
          color: "red",
          autoClose: false,
        });
      } else {
        log.error("[App] Failed to add page:", error);
      }
      return;
    }

    fetchPages();
    // Switch to the newly created page
    if (data && data.page_id) {
      setCurrentPageId(data.page_id);
      // Returning page_id for testing purposes
      return data.page_id;
    }
  };

  useEffect(() => {
    if (!dbId) return;
    log.debug(`[App] Current page ID changed`, { currentPageId });
    const fetchTitle = async () => {
      if (!currentPageId) return;
      log.debug(`[App] Fetching title`, { page_id: currentPageId });
      const { data, error } = await getPageDbDbIdPagesPageIdGet({
        path: { db_id: dbId, page_id: currentPageId },
      });

      if (error) {
        log.error("[App] Failed to fetch page title:", error);
        return;
      }

      if (data?.title) {
        setTitle(data.title);
      }
    };

    const fetchBlocks = async () => {
      if (!currentPageId) return;
      log.debug(`[App] Fetching blocks`, { page_id: currentPageId });
      const { data, error } = await getBlocksDbDbIdBlocksPageIdGet({
        path: { db_id: dbId, page_id: currentPageId },
      });

      if (error) {
        log.error("[App] Failed to fetch blocks:", error);
        return;
      }

      if (data) {
        if (data.length === 0) {
          log.debug(`[App] No blocks found, creating new block`, {
            page_id: currentPageId,
          });
          const { data: newBlock, error: newBlockError } =
            await addBlockDbDbIdBlocksPost({
              path: { db_id: dbId },
              body: { page_id: currentPageId, content: "", position: 0 },
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

    fetchTitle();
    fetchBlocks();
  }, [currentPageId, dbId]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  useEffect(() => {
    // Update everything on DB change
    if (dbId) {
      log.debug(`[App] dbId changed to ${dbId}, re-fetching data`);
      const fetchData = async () => {
        await getAllWorkspaces();
        await fetchPages();
        setIsSwitchingDatabase(false);
      };
      fetchData();
    }
  }, [dbId, getAllWorkspaces, fetchPages]);

  // Update current page ID based on URL parameter
  useEffect(() => {
    if (pageId) {
      // Check if the page exists in our pages list before setting it as current
      const pageExists = pages.some((page) => page.page_id === pageId);
      if (pageExists) {
        setCurrentPageId(pageId);
      } else {
        setCurrentPageId(null);
        log.error(`Page with ID ${pageId} does not exist`);
        // Leave currentPageId as null, so nothing is displayed
      }
    } else if (pages.length > 0) {
      // If no pageId in URL, but pages exist, set to first page
      setCurrentPageId(pages[0].page_id);
    } else {
      setCurrentPageId(null);
    }
  }, [pageId, pages]);

  if (showWelcomeScreen) {
    return <WelcomeScreen onDatabaseCreated={getAllDatabases} />;
  }

  if (!dbId) {
    return (
      <CreateDatabaseModal
        opened={createDbModalOpened}
        onClose={() => setCreateDbModalOpened(false)}
        onDatabaseCreated={getAllDatabases}
      />
    );
  }

  return (
    <Box pos="relative">
      <LoadingOverlay
        visible={isSwitchingDatabase}
        zIndex={1000}
        overlayProps={{ radius: "sm", blur: 2 }}
      />
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
          <SearchBox
            onAddPage={handleAddPage}
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
          onDatabaseCreated={getAllDatabases}
        />
        <AppShell.Main>
          {currentPageId && (
            <Page
              key={currentPageId}
              page_id={currentPageId}
              title={title}
              blocks={blocks}
              isRenaming={isRenaming}
              setIsRenaming={setIsRenaming}
              handleDeletePage={handleDeletePage}
              handleRenamePage={handleRenamePage}
            />
          )}
        </AppShell.Main>
        <AppShell.Aside p="md" pt={0}>
          <RightSidebar onClose={handleRightSidebarToggle} />
        </AppShell.Aside>
      </AppShell>
    </Box>
  );
}
export default App;
