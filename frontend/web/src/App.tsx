import { AppShell } from "@mantine/core";

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
    const all_workspaces = (await getWorkspacesWorkspacesGet())
      .data as Workspace[];
    const sorted_workspaces = [
      // Structure default first then most recent
      all_workspaces[0],
      ...all_workspaces.slice(1).reverse(),
    ];
    setWorkspaces(sorted_workspaces);
    if (activeWorkspaceId === null) {
      setActiveWorkspaceId(0);
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
    const response = await getPagesPagesGet();
    if (response.data) {
      log.debug(`[App] Fetched ${response.data.length} pages`);
      setPages(response.data);
      if (response.data.length > 0 && currentPageId === null) {
        log.debug(`[App] Setting current page to ${response.data[0].page_id}`);
        setCurrentPageId(response.data[0].page_id);
      }
    }
  }, [currentPageId]);

  const handleDeletePage = async (page_id: string) => {
    log.debug(`[App] Deleting page`, { page_id });
    await deletePagePagesPageIdDelete({ path: { page_id } });
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
    try {
      const response = await addPagePagesPost({ body: { title } });
      fetchPages();
      // Switch to the newly created page
      if (response.data && response.data.page_id) {
        setCurrentPageId(response.data.page_id);
      }
      return response;
    } catch (error) {
      if (error.status === 409) {
        log.error("A page with this title already exists.");
      } else {
        log.error("[App] Failed to add page:", error);
      }
    }
  };

  useEffect(() => {
    log.debug(`[App] Current page ID changed`, { currentPageId });
    const fetchTitle = async () => {
      if (!currentPageId) return;
      log.debug(`[App] Fetching title`, { page_id: currentPageId });
      const response = await getPagePagesPageIdGet({
        path: { page_id: currentPageId },
      });
      if (response.data?.title) {
        setTitle(response.data.title);
      }
    };

    const fetchBlocks = async () => {
      if (!currentPageId) return;
      log.debug(`[App] Fetching blocks`, { page_id: currentPageId });
      const response = await getBlocksBlocksPageIdGet({
        path: { page_id: currentPageId },
      });
      if (response.data) {
        if (response.data.length === 0) {
          log.debug(`[App] No blocks found, creating new block`, {
            page_id: currentPageId,
          });
          const newBlock = await addBlockBlocksPost({
            body: { page_id: currentPageId, content: "", position: 0 },
          });
          if (newBlock.data) {
            setBlocks([newBlock.data]);
          }
        } else {
          log.debug(`[App] Fetched blocks`, {
            count: response.data.length,
            page_id: currentPageId,
          });
          setBlocks(response.data);
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
        height: 35,
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
      <AppShell.Header style={{ border: "none" }}>
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
      <AppShell.Aside p="md">
        <RightSidebar onClose={handleRightSidebarToggle} />
      </AppShell.Aside>
    </AppShell>
  );
}

export default App;
