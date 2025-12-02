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
import {
  IconSearch,
  IconX,
  IconFileText,
  IconSquareRoundedLetterB,
  IconPlus,
} from "@tabler/icons-react";
import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  type PageModel,
  type BlockModel,
  searchDbDbIdSearchPost,
  type SearchRequest,
} from "../../api-client";
import { useDatabase } from "../../hooks/useDatabase";
import { usePageData } from "../../hooks/usePageData";

interface SearchResult {
  pages: PageModel[];
  blocks: BlockModel[];
}

interface SearchPaletteProps {
  opened: boolean;
  onClose: () => void;
}

export default function SearchPalette({
  opened,
  onClose,
}: SearchPaletteProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1); // For keyboard navigation
  const { dbId } = useDatabase();
  const { handleAddPage } = usePageData();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const focusTrapRef = useFocusTrap();

  // Debounce the query to avoid too many API calls
  const [debouncedQuery] = useDebouncedValue(query, 300);

  // Handle keyboard navigation
  const handleKeyDown = (event: KeyboardEvent) => {
    // Calculate total items including both search results and command options
    const totalPages = results?.pages?.length || 0;
    const totalBlocks = results?.blocks?.length || 0;
    const totalSearchResults = totalPages + totalBlocks;

    // Always include command section when query exists
    const hasCommands = query.trim();
    const totalItems = totalSearchResults + (hasCommands ? 1 : 0);

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((prev) => (prev < totalItems - 1 ? prev + 1 : -1)); // Cycle back to start if at end
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((prev) => (prev > -1 ? prev - 1 : totalItems - 1)); // Cycle back to end if at start
        break;
      case "Enter":
        event.preventDefault();
        if (activeIndex >= 0) {
          if (hasCommands && activeIndex === totalSearchResults) {
            // The command option is selected (it's the last item when commands are shown)
            handleCreatePageCommand();
          } else if (results) {
            // A search result is selected
            handleSelectResult(activeIndex);
          }
        }
        break;
      case "Escape":
        onClose();
        break;
    }
  };

  const handleCreatePageCommand = async () => {
    if (query.trim()) {
      const newPageId = await handleAddPage(query.trim());
      if (newPageId) {
        navigate(`/db/${dbId}/pages/${newPageId}`);
        onClose();
      }
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
          setError(
            `Search failed: ${response.error.detail || "Unknown error"}`,
          );
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
        navigate(`/db/${dbId}/pages/${item.page_id}`);
        onClose();
      } else if (item.page_id) {
        // Navigate to the block's page
        navigate(`/db/${dbId}/pages/${item.page_id}`);
        onClose();
      }
    }
  };

  const handlePageClick = (pageId: string) => {
    // Navigate to the page using the router
    navigate(`/db/${dbId}/pages/${pageId}`);
    onClose();
  };

  const handleBlockClick = (blockId: string, pageId: string | undefined) => {
    if (pageId) {
      // Navigate to the page containing the block
      navigate(`/db/${dbId}/pages/${pageId}`);
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
        ) : results &&
          (results.pages?.length > 0 || results.blocks?.length > 0) ? (
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
                        style={{
                          cursor: "pointer",
                          borderRadius: "var(--mantine-radius-sm)",
                        }}
                        onMouseEnter={() => setActiveIndex(resultIndex)}
                      >
                        <Group wrap="nowrap">
                          <IconFileText size={16} stroke={1.5} />
                          <div style={{ flex: 1 }}>
                            {(() => {
                              const safeQuery =
                                query && typeof query === "string" ? query : "";
                              const safeTitle =
                                page.title && typeof page.title === "string"
                                  ? page.title
                                  : "";
                              return (
                                <Highlight
                                  highlight={safeQuery}
                                  fz="sm"
                                  fw={500}
                                >
                                  {safeTitle}
                                </Highlight>
                              );
                            })()}
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
                        onClick={() =>
                          handleBlockClick(block.block_id, block.page_id)
                        }
                        bg={isActive ? "gray.1" : "transparent"}
                        px="sm"
                        py="xs"
                        style={{
                          cursor: "pointer",
                          borderRadius: "var(--mantine-radius-sm)",
                        }}
                        onMouseEnter={() => setActiveIndex(resultIndex)}
                      >
                        <Group wrap="nowrap">
                          <IconSquareRoundedLetterB size={16} stroke={1.5} />
                          <div style={{ flex: 1 }}>
                            {(() => {
                              const safeQuery =
                                query && typeof query === "string" ? query : "";
                              const safeContent = (
                                block.content &&
                                typeof block.content === "string"
                                  ? block.content.substring(0, 100)
                                  : ""
                              ).toString();
                              const safeEllipsis =
                                block.content &&
                                typeof block.content === "string" &&
                                block.content.length > 100
                                  ? "..."
                                  : "";
                              return (
                                <Highlight
                                  highlight={safeQuery}
                                  fz="sm"
                                  fw={500}
                                >
                                  {safeContent + safeEllipsis}
                                </Highlight>
                              );
                            })()}
                          </div>
                        </Group>
                      </Box>
                    );
                  })}
                </Box>
              )}

              {/* Commands Section - Always show when query exists */}
              {query.trim() && (
                <Box mt="md">
                  <Text size="sm" c="dimmed" mb="xs" px="sm">
                    COMMANDS
                  </Text>
                  {[
                    {
                      id: "create-page",
                      label: `Create page "${query}"`,
                      icon: <IconPlus size={16} stroke={1.5} />,
                      action: () => handleCreatePageCommand()
                    }
                  ].map((command, index) => {
                    const totalSearchResults = (results?.pages?.length || 0) + (results?.blocks?.length || 0);
                    const resultIndex = totalSearchResults + index; // Command index comes after all search results
                    const isActive = activeIndex === resultIndex;

                    return (
                      <Box
                        key={command.id}
                        onClick={command.action}
                        bg={isActive ? "gray.1" : "transparent"}
                        px="sm"
                        py="xs"
                        style={{
                          cursor: "pointer",
                          borderRadius: "var(--mantine-radius-sm)",
                        }}
                        onMouseEnter={() => setActiveIndex(resultIndex)}
                      >
                        <Group wrap="nowrap">
                          {command.icon}
                          <div style={{ flex: 1 }}>
                            <Text fz="sm" fw={500}>
                              {command.label}
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
          <ScrollArea.Autosize mah={400} type="auto">
            <Stack gap="sm">
              {/* Commands Section - Show when query exists but no results */}
              <Box mt="md">
                <Text size="sm" c="dimmed" mb="xs" px="sm">
                  COMMANDS
                </Text>
                {[
                  {
                    id: "create-page",
                    label: `Create page "${query}"`,
                    icon: <IconPlus size={16} stroke={1.5} />,
                    action: () => handleCreatePageCommand()
                  }
                ].map((command, index) => {
                  const resultIndex = index; // Since there are no search results, command index starts at 0
                  const isActive = activeIndex === resultIndex;

                  return (
                    <Box
                      key={command.id}
                      onClick={command.action}
                      bg={isActive ? "gray.1" : "transparent"}
                      px="sm"
                      py="xs"
                      style={{
                        cursor: "pointer",
                        borderRadius: "var(--mantine-radius-sm)",
                      }}
                      onMouseEnter={() => setActiveIndex(resultIndex)}
                    >
                      <Group wrap="nowrap">
                        {command.icon}
                        <div style={{ flex: 1 }}>
                          <Text fz="sm" fw={500}>
                            {command.label}
                          </Text>
                        </div>
                      </Group>
                    </Box>
                  );
                })}
              </Box>
            </Stack>
          </ScrollArea.Autosize>
        ) : (
          <Text c="dimmed" ta="center" py="lg">
            Type to search pages and blocks...
          </Text>
        )}
      </Box>
    </Modal>
  );
}