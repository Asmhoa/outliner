import { AppShell } from "@mantine/core";
import { showNotification } from "@mantine/notifications";

import { useDisclosure } from "@mantine/hooks";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import log from "./utils/logger";

import "./App.css";
import Page from "./components/Page";
import RightSidebar from "./components/sidebar/RightSidebar";
import {
  getPagePagesPageIdGet,
  getBlocksBlocksPageIdGet,
  addPagePagesPost,
  getPagesPagesGet,
  deletePagePagesPageIdDelete,
  addBlockBlocksPost,
  getWorkspacesWorkspacesGet,
  type Block,
  type Page as PageType,
  type Workspace,
} from "./api-client";
import SearchBox from "./components/sidebar/SearchBox";
import LeftSidebar from "./components/sidebar/LeftSidebar";

type NavbarVisibility = "visible" | "workspace-collapsed" | "sidebar-collapsed";

function App() {
  const { pageId } = useParams<{ pageId: string }>(); // get page_id from URL

  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [pages, setPages] = useState<PageType[]>([]);
  const [opened, { toggle }] = useDisclosure();

  const [isRenaming, setIsRenaming] = useState(false);

  // Load things from the DB
  // Workspaces
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(
    null,
  );

  async function getAllWorkspaces() {
    const { data: all_workspaces, error } = await getWorkspacesWorkspacesGet(
      {},
    );
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
  }

  useEffect(() => {
    getAllWorkspaces();
  }, []);

  // Other
  const databases = [
    { value: "db1", label: "Database 1" },
    { value: "db2", label: "Database 2" },
    { value: "db3", label: "Database 3" },
  ];

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
    log.debug("[App] Fetching pages...");
    const { data, error } = await getPagesPagesGet({});
    if (error) {
      log.error("[App] Failed to fetch pages:", error);
      return;
    }
    if (data) {
      log.debug(`[App] Fetched ${data.length} pages`);
      setPages(data);
      if (data.length > 0 && currentPageId === null) {
        log.debug(`[App] Setting current page to ${data[0].page_id}`);
        setCurrentPageId(data[0].page_id);
      }
    }
  }, [currentPageId]);

  const handleDeletePage = async (page_id: string) => {
    log.debug(`[App] Deleting page`, { page_id });
    const { error } = await deletePagePagesPageIdDelete({
      path: { page_id },
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
    log.debug(`[App] Adding new page`, { title });
    const { data, error, response } = await addPagePagesPost({
      body: { title },
    });

    if (error) {
      if (response.status === 409) {
        const errorMessage =
          (error as any).detail || "A page with this title already exists.";
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
    }
    return { data, error, response };
  };

  useEffect(() => {
    log.debug(`[App] Current page ID changed`, { currentPageId });
    const fetchTitle = async () => {
      if (!currentPageId) return;
      log.debug(`[App] Fetching title`, { page_id: currentPageId });
      const { data, error } = await getPagePagesPageIdGet({
        path: { page_id: currentPageId },
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
      const { data, error } = await getBlocksBlocksPageIdGet({
        path: { page_id: currentPageId },
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
            await addBlockBlocksPost({
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
  }, [currentPageId]);

  useEffect(() => {
    fetchPages();
  }, []);

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
    }
  }, [pageId, pages]);

  return (
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
  );
}

export default App;
