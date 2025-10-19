import { AppShell, Portal } from "@mantine/core";

import { useDisclosure } from "@mantine/hooks";
import { useEffect, useState, useCallback } from "react";
import log from "./utils/logger";

import "./App.css";
import Page from "./components/Page";
import RightSidebar from "./components/sidebar/RightSidebar";
import {
  getPagePagesPageIdGet,
  getBlocksBlocksPageIdGet,
  addPagePagesPost,
  getPagesPagesGet,
  deletePagePagesDelete,
  addBlockBlocksPost,
  getWorkspacesWorkspacesGet,
  type Block,
  type Page as PageType,
  type Workspace,
} from "./api-client";
import SearchBox from "./components/sidebar/SearchBox";
import LeftSidebar from "./components/sidebar/LeftSidebar";

// const mockWorkspaces: Workspace[] = [
//   { id: "0", name: "Personal", color: "#4285F4" },
//   { id: "1", name: "Work", color: "#34A853" },
//   { id: "2", name: "Projects", color: "#FBBC05" },
//   { id: "3", name: "Archive Test Long Name", color: "#EA4335" },
// ];

type NavbarVisibility = "visible" | "workspace-collapsed" | "sidebar-collapsed";

function App() {
  const [currentPageId, setCurrentPageId] = useState<number | null>(null);
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

  const handleAddNewWorkspace = (newWorkspace: Workspace) => {
    setWorkspaces([workspaces[0], newWorkspace, ...workspaces.splice(1)]);
  };

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
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);

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
    log.debug("Fetching pages...");
    const response = await getPagesPagesGet();
    if (response.data) {
      log.debug(`Fetched ${response.data.length} pages.`);
      setPages(response.data);
      if (response.data.length > 0 && currentPageId === null) {
        log.debug(`Setting current page to ${response.data[0].page_id}`);
        setCurrentPageId(response.data[0].page_id);
      }
    }
  }, [currentPageId]);

  const handleDeletePage = async (page_id: number) => {
    log.debug(`Deleting page with page_id: ${page_id}`);
    await deletePagePagesDelete({ body: { page_id } });
    fetchPages();
    setCurrentPageId(null);
    setTitle("");
    setBlocks([]);
  };

  const handleRenamePage = () => {
    setIsRenaming(true);
  };

  const handleAddPage = async (title: string) => {
    log.debug(`Adding new page with title: "${title}"`);
    await addPagePagesPost({ body: { title } });
    fetchPages();
  };

  useEffect(() => {
    log.debug(`Current page ID changed to: ${currentPageId}`);
    const fetchTitle = async () => {
      if (!currentPageId) return;
      log.debug(`Fetching title for page_id: ${currentPageId}`);
      const response = await getPagePagesPageIdGet({
        path: { page_id: currentPageId },
      });
      if (response.data?.title) {
        setTitle(response.data.title);
      }
    };

    const fetchBlocks = async () => {
      if (!currentPageId) return;
      log.debug(`Fetching blocks for page_id: ${currentPageId}`);
      const response = await getBlocksBlocksPageIdGet({
        path: { page_id: currentPageId },
      });
      if (response.data) {
        if (response.data.length === 0) {
          log.debug(
            `No blocks found for page_id: ${currentPageId}, creating a new one.`,
          );
          const newBlock = await addBlockBlocksPost({
            body: { page_id: currentPageId, content: "", position: 0 },
          });
          if (newBlock.data) {
            setBlocks([newBlock.data]);
          }
        } else {
          log.debug(
            `Fetched ${response.data.length} blocks for page_id: ${currentPageId}`,
          );
          setBlocks(response.data);
        }
      }
    };

    fetchTitle();
    fetchBlocks();
  }, [currentPageId]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]); // Added fetchPages to dependency array

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
          // onAddPage={handleAddPage}
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
        toggle={toggle}
        navbarVisibility={navbarVisibility}
        workspaces={workspaces}
        handleAddNewWorkspace={handleAddNewWorkspace}
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
