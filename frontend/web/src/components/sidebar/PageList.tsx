import { Text } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { useDatabase } from "../../hooks/useDatabase";
import type { Page as PageType } from "../../api-client";
import log from "../../utils/logger";

interface PageListProps {
  pages: PageType[];
  currentPageId: string | null;
}

const PageList: React.FC<PageListProps> = ({ 
  pages, 
  currentPageId 
}) => {
  const navigate = useNavigate();
  const { dbId } = useDatabase();

  return (
    <div>
      {pages.map((page) => (
        <Text
          key={page.page_id}
          fw={page.page_id === currentPageId ? 600 : 400}
          c={page.page_id === currentPageId ? "blue" : "gray"}
          onClick={() => {
            navigate("/db/" + dbId + "/pages/" + page.page_id);
          }}
          style={{ 
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '4px',
            margin: '2px 0',
            ':hover': { backgroundColor: '#f0f0f0' }
          }}
        >
          {page.title}
        </Text>
      ))}
    </div>
  );
};

export default PageList;