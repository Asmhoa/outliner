import {
  Modal,
  TextInput,
  ScrollArea,
  Box,
  Text,
  Group,
  ActionIcon,
  Divider,
  Highlight,
  Stack,
  Loader,
  Alert,
} from "@mantine/core";
import { useDisclosure, useDebouncedValue, useFocusTrap } from "@mantine/hooks";
import { IconSearch, IconX, IconFileText, IconSquareRoundedLetterB } from "@tabler/icons-react";
import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { type PageModel, type BlockModel, searchDbDbIdSearchPost, type SearchRequest } from "../../api-client";
import { useDatabase } from "../../hooks/useDatabase";

interface SearchResult {
  pages: PageModel[];
  blocks: BlockModel[];
}

interface CommandPaletteProps {
  opened: boolean;
  onClose: () => void;
}

export default function CommandPalette({ opened, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1); // For keyboard navigation
  const { dbId } = useDatabase();
  const inputRef = useRef<HTMLInputElement>(null);
  const focusTrapRef = useFocusTrap();

  // Debounce the query to avoid too many API calls
  const [debouncedQuery] = useDebouncedValue(query, 300);

  // Handle keyboard navigation
  const handleKeyDown = (event: KeyboardEvent) => {
    if (!results) return;

    const totalResults = (results.pages?.length || 0) + (results.blocks?.length || 0);

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((prev) => (prev < totalResults - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        event.preventDefault();
        if (activeIndex >= 0) {
          handleSelectResult(activeIndex);
        }
        break;
      case "Escape":
        onClose();
        break;
    }
  };

  // Fetch search results when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim() || !dbId) {
      setResults(null);
      setError(null);
      setActiveIndex(-1);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await searchDbDbIdSearchPost({
          path: { db_id: dbId },
          body: {
            query: debouncedQuery,
            search_type: "all",
            limit: 20,
          },
        });

        if (response.error) {
          setError(`Search failed: ${response.error.detail || "Unknown error"}`);
          setResults(null);
        } else {
          setResults(response.data);
          setActiveIndex(-1); // Reset active index when new results load
        }
      } catch (err) {
        setError("An error occurred while searching");
        setResults(null);
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery, dbId]);

  // Reset query and results when modal opens/closes
  useEffect(() => {
    if (opened) {
      setQuery("");
      setResults(null);
      setError(null);
      setActiveIndex(-1);
      // Focus the input when the modal opens
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [opened]);

  const handleSelectResult = (index: number) => {
    if (!results) return;

    let item: PageModel | BlockModel | null = null;
    let isPage = true;

    // Determine if the selected item is a page or block
    if (index < (results.pages?.length || 0)) {
      item = results.pages![index];
      isPage = true;
    } else {
      item = results.blocks![index - (results.pages?.length || 0)];
      isPage = false;
    }

    if (item) {
      if (isPage) {
        // Navigate to the page
        window.location.href = `/#/db/${dbId}/page/${item.page_id}`;
        onClose();
      } else if (item.page_id) {
        // Navigate to the block's page
        window.location.href = `/#/db/${dbId}/page/${item.page_id}`;
        onClose();
      }
    }
  };

  const handlePageClick = (pageId: string) => {
    // Navigate to the page using the router
    window.location.hash = `#/db/${dbId}/page/${pageId}`;
    onClose();
  };

  const handleBlockClick = (blockId: string, pageId: string | undefined) => {
    if (pageId) {
      // Navigate to the page containing the block
      window.location.hash = `#/db/${dbId}/page/${pageId}`;
      onClose();
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      centered
      radius="md"
      padding="sm"
      withCloseButton={false}
      trapFocus={false}
      lockScroll={false}
      styles={{
        inner: {
          left: 0,
        },
      }}
    >
      <Box ref={focusTrapRef}>
        <Group mb="sm">
          <IconSearch size={18} stroke={1.5} />
          <TextInput
            ref={inputRef}
            placeholder="Search pages and blocks..."
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            flex={1}
            variant="unstyled"
            styles={{ input: { fontSize: "1.2rem", padding: 0 } }}
          />
          <ActionIcon variant="subtle" onClick={onClose} size="lg">
            <IconX size={18} stroke={1.5} />
          </ActionIcon>
        </Group>

        <Divider mb="sm" />

        {loading ? (
          <Group justify="center" py="lg">
            <Loader />
          </Group>
        ) : error ? (
          <Alert color="red" title="Search Error">
            {error}
          </Alert>
        ) : results && (results.pages.length > 0 || results.blocks.length > 0) ? (
          <ScrollArea.Autosize mah={400} type="auto">
            <Stack gap="sm">
              {/* Pages Section */}
              {results.pages && results.pages.length > 0 && (
                <Box>
                  <Text size="sm" c="dimmed" mb="xs" px="sm">
                    PAGES ({results.pages.length})
                  </Text>
                  {results.pages.map((page, index) => {
                    const resultIndex = index;
                    const isActive = activeIndex === resultIndex;
                    return (
                      <Box
                        key={page.page_id}
                        onClick={() => handlePageClick(page.page_id)}
                        bg={isActive ? "gray.1" : "transparent"}
                        px="sm"
                        py="xs"
                        style={{ cursor: "pointer", borderRadius: "var(--mantine-radius-sm)" }}
                        onMouseEnter={() => setActiveIndex(resultIndex)}
                      >
                        <Group wrap="nowrap">
                          <IconFileText size={16} stroke={1.5} />
                          <div style={{ flex: 1 }}>
                            <Highlight highlight={query} fz="sm" fw={500}>
                              {page.title}
                            </Highlight>
                            <Text size="xs" c="dimmed" lineClamp={1}>
                              Page
                            </Text>
                          </div>
                        </Group>
                      </Box>
                    );
                  })}
                </Box>
              )}

              {/* Blocks Section */}
              {results.blocks && results.blocks.length > 0 && (
                <Box mt="md">
                  <Text size="sm" c="dimmed" mb="xs" px="sm">
                    BLOCKS ({results.blocks.length})
                  </Text>
                  {results.blocks.map((block, index) => {
                    const resultIndex = (results.pages?.length || 0) + index;
                    const isActive = activeIndex === resultIndex;
                    return (
                      <Box
                        key={block.block_id}
                        onClick={() => handleBlockClick(block.block_id, block.page_id)}
                        bg={isActive ? "gray.1" : "transparent"}
                        px="sm"
                        py="xs"
                        style={{ cursor: "pointer", borderRadius: "var(--mantine-radius-sm)" }}
                        onMouseEnter={() => setActiveIndex(resultIndex)}
                      >
                        <Group wrap="nowrap">
                          <IconSquareRoundedLetterB size={16} stroke={1.5} />
                          <div style={{ flex: 1 }}>
                            <Highlight highlight={query} fz="sm" fw={500}>
                              {block.content.substring(0, 100)}
                              {block.content.length > 100 ? "..." : ""}
                            </Highlight>
                            <Text size="xs" c="dimmed" lineClamp={1}>
                              Block in {block.page_id ? "page" : "unknown"}
                            </Text>
                          </div>
                        </Group>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Stack>
          </ScrollArea.Autosize>
        ) : query.trim() && !loading ? (
          <Text c="dimmed" ta="center" py="lg">
            No results found for "{query}"
          </Text>
        ) : (
          <Text c="dimmed" ta="center" py="lg">
            Type to search pages and blocks...
          </Text>
        )}
      </Box>
    </Modal>
  );
}