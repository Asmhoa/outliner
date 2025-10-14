import {
  AppShell,
  Burger,
  Title,
  Button,
  NavLink,
  Group,
  TextInput,
  rem,
  Stack,
} from "@mantine/core";
import { IconSearch, IconPlus } from "@tabler/icons-react";
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

function App() {
  const [currentPageId, setCurrentPageId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [pages, setPages] = useState<PageType[]>([]);
  const [opened, { toggle }] = useDisclosure();
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(
    mockWorkspaces[0].id,
  );

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
      padding={0}
      // navbar={{
      //   width: 320,
      //   collapsed: { mobile: !opened },
      // }}
    >
      <AppShell.Navbar>
        <Group gap={0} align="flex-start">
          <WorkspaceSidebar
            workspaces={mockWorkspaces}
            activeWorkspaceId={activeWorkspaceId}
            onWorkspaceClick={setActiveWorkspaceId}
          />
          <Stack p="md">
            <AppShell.Section>
              <Group mb="sm">
                <TextInput
                  style={{ flex: 1 }}
                  placeholder="Search"
                  leftSection={
                    <IconSearch style={{ width: rem(16), height: rem(16) }} />
                  }
                />
                <Button
                  onClick={async () => {
                    const title = prompt("Enter page title");
                    if (!title) {
                      return; // User cancelled or entered empty title
                    }
                    log.debug(`Adding new page with title: "${title}"`);
                    await addPagePagesPost({ body: { title } });
                    fetchPages();
                  }}
                >
                  <IconPlus size={16} />
                </Button>
              </Group>
            </AppShell.Section>
            <AppShell.Section>
              <Title order={4}>Favorites</Title>
            </AppShell.Section>
            <AppShell.Section>
              <Title order={4}>Views</Title>
            </AppShell.Section>
            <AppShell.Section>
              <Title order={4}>Notes</Title>
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
      <AppShell.Main p="md">
        <Group>
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <Title order={3}>{title}</Title>
        </Group>
        {currentPageId && (
          <Page
            page_id={currentPageId}
            title={title}
            blocks={blocks}
            onDelete={handleDeletePage}
          />
        )}
      </AppShell.Main>

      <AppShell.Aside p="md" w={300}>
        <RightSidebar />
      </AppShell.Aside>
    </AppShell>
  );
}

export default App;
