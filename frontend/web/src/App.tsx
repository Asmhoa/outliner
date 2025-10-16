import { AppShell, NavLink, Group, Stack, Title } from "@mantine/core";

import { useDisclosure } from "@mantine/hooks";
import { useEffect, useState, useCallback } from "react";
import log from "./utils/logger";

import "./App.css";
import Page from "./components/Page";
import WorkspaceSidebar from "./components/WorkspaceSidebar";
import RightSidebar from "./components/RightSidebar";
import {
  getPagePagesPageIdGet,
  getBlocksBlocksPageIdGet,
  addPagePagesPost,
  getPagesPagesGet,
  deletePagePagesDelete,
  addBlockBlocksPost,
  type Block,
  type Page as PageType,
} from "./api-client";
import SearchBox from "./components/sidebar/SearchBox";

interface Workspace {
  id: string;
  name: string;
  color: string; // For tab color
}

const mockWorkspaces: Workspace[] = [
  { id: "ws1", name: "Personal", color: "blue" },
  { id: "ws2", name: "Work", color: "green" },
  { id: "ws3", name: "Projects", color: "red" },
  { id: "ws4", name: "Archive", color: "gray" },
];

type NavbarVisibility = "visible" | "workspace-collapsed" | "sidebar-collapsed";

function App() {
  const [currentPageId, setCurrentPageId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [pages, setPages] = useState<PageType[]>([]);
  const [opened, { toggle }] = useDisclosure();
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(
    mockWorkspaces[0].id,
  );
  const [navbarVisibility, setNavbarVisibility] =
    useState<NavbarVisibility>("visible");
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);

  const handleRightSidebarToggle = () => {
    setRightSidebarCollapsed(!rightSidebarCollapsed);
  };

  const handleChevronClick = () => {
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

  const handlePageRenamed = (pageId: number, newTitle: string) => {
    setPages(pages.map(p => p.page_id === pageId ? {...p, title: newTitle} : p));
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
      navbar={{
        width: 300,
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
      <AppShell.Navbar p="sm">
        <AppShell.Section>
          <SearchBox
            onAddPage={handleAddPage}
            navbarVisibility={navbarVisibility}
            onChevronClick={handleChevronClick}
          />
        </AppShell.Section>
        <Group>
          {navbarVisibility === "visible" && (
            <WorkspaceSidebar
              workspaces={mockWorkspaces}
              activeWorkspaceId={activeWorkspaceId}
              onWorkspaceClick={setActiveWorkspaceId}
            />
          )}
          <Stack>
            <AppShell.Section>
              <Title order={4}>Favorites</Title>
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
              <Title order={4}>Views</Title>
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
              <Title order={4}>Notes</Title>
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
          </Stack>
        </Group>
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
      </AppShell.Navbar>

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
            handleChevronClick={handleChevronClick}
            handleRightSidebarToggle={handleRightSidebarToggle}
            navbarVisibility={navbarVisibility}
            rightSidebarCollapsed={rightSidebarCollapsed}
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
