import {
  Text,
  Stack,
  Paper,
  Group,
  Divider,
  Title,
  Pagination,
  SimpleGrid,
  Container
} from "@mantine/core";
import { useNavigate, useParams } from "react-router-dom";
import { useDatabase } from "../../hooks/useDatabase";
import type { Page as PageType } from "../../api-client";
import { useState } from "react";
import log from "../../utils/logger";

interface AllPagesProps {
  pages: PageType[];
}

const AllPages: React.FC<AllPagesProps> = ({ pages }) => {
  const navigate = useNavigate();
  const { dbId } = useDatabase();
  const { dbId: urlDbId } = useParams<{ dbId: string }>();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20; // Show 20 pages per page

  const handlePageClick = (pageId: string) => {
    if (!dbId) {
      log.error("No database ID available");
      return;
    }
    navigate(`/db/${dbId}/pages/${pageId}`);
  };

  // Calculate pagination values
  const totalItems = pages.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Get current page items
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = pages.slice(startIndex, endIndex);

  return (
    <Stack gap="md" style={{ minHeight: '100%', flexGrow: 1, backgroundColor: 'white', padding: '1rem', borderRadius: '4px' }}>
      <Title order={2}>All Pages</Title>
      <Text c="dimmed" size="sm">
        {pages.length} page{pages.length !== 1 ? 's' : ''} in this database
      </Text>

      <Divider my="sm" />

      {totalItems === 0 ? (
        <Text c="dimmed">No pages found in this database.</Text>
      ) : (
        <>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm" style={{ flexGrow: 1 }}>
            {currentItems.map((page) => (
              <Paper
                key={page.page_id}
                p="md"
                shadow="sm"
                withBorder
                onClick={() => handlePageClick(page.page_id)}
                style={{ cursor: 'pointer', transition: 'transform 0.2s', height: '100%' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'sm';
                }}
              >
                <Group justify="space-between">
                  <Text fw={500}>{page.title}</Text>
                  <Text size="xs" c="dimmed">
                    {new Date(page.created_at).toLocaleDateString()}
                  </Text>
                </Group>
              </Paper>
            ))}
          </SimpleGrid>

          {totalPages > 1 && (
            <Pagination
              value={currentPage}
              onChange={setCurrentPage}
              total={totalPages}
              align="center"
              mt="md"
              size="sm"
            />
          )}
        </>
      )}
    </Stack>
  );
};

export default AllPages;