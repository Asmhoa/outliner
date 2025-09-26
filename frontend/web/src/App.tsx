import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useEffect, useState } from "react";
import log from "./utils/logger";

import "./App.css";
import Page from "./components/Page";
import {
  getPagePagesPageIdGet,
  getBlocksBlocksPageIdGet,
  addPagePagesPost,
  getPagesPagesGet,
  type Block,
  type Page as PageType,
} from "./api-client";

function App() {
  const [currentPageId, setCurrentPageId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [pages, setPages] = useState<PageType[]>([]);

  const fetchPages = async () => {
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
          log.debug(`No blocks found for page_id: ${currentPageId}, creating a new one.`);
          const newBlock = await addBlockBlocksPost({ body: { page_id: currentPageId, content: "", position: 0 } });
          setBlocks([newBlock]);
        } else {
          log.debug(`Fetched ${response.data.length} blocks for page_id: ${currentPageId}`);
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

  return (
    <PanelGroup direction="horizontal">
      <Panel collapsible defaultSize={20} minSize={20} maxSize={30}>
        <div className="sidebar">
          <div className="sidebar-header">
            <p>Recently edited pages</p>
            <button
              onClick={async () => {
                let title = "";
                while (!title) {
                  title = prompt("Enter page title") || "";
                }
                log.debug(`Adding new page with title: "${title}"`);
                await addPagePagesPost({ body: { title } });
                fetchPages();
              }}
              className="add-page-button"
            >
              +
            </button>
          </div>
          <ul>
            {pages.map((page) => (
              <li key={page.page_id} onClick={() => setCurrentPageId(page.page_id)}>{page.title}</li>
            ))}
          </ul>
        </div>
      </Panel>
      <PanelResizeHandle className="resize-handle" />
      <Panel minSize={30}>
        {currentPageId && <Page page_id={currentPageId} title={title} blocks={blocks} />}
      </Panel>
    </PanelGroup>
  );
}

export default App;
