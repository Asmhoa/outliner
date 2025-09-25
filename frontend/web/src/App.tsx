import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useEffect, useState } from "react";

import "./App.css";
import Page from "./components/Page";
import {
  getPagePagesPageIdGet,
  getBlocksBlocksPageIdGet,
  type Block,
} from "./api-client";

function App() {
  const current_page_id = 2;
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<any[]>([]);

  useEffect(() => {
    const fetchTitle = async () => {
      const response = await getPagePagesPageIdGet({
        path: { page_id: current_page_id },
      });
      if (response.data?.title) {
        setTitle(response.data.title);
      }
    };

    const fetchBlocks = async () => {
      const response = await getBlocksBlocksPageIdGet({
        path: { page_id: current_page_id },
      });

      const block_contents: string[] = [];

      response.data?.forEach((b: Block) => {
        block_contents.push(b.content);
      });
      setBlocks(block_contents);
    };

    fetchTitle();
    fetchBlocks();
  }, []);

  return (
    <PanelGroup direction="horizontal">
      <Panel collapsible defaultSize={20} minSize={20} maxSize={30}>
        <div className="sidebar">
          <p>Recently edited pages</p>
        </div>
      </Panel>
      <PanelResizeHandle className="resize-handle" />
      <Panel minSize={30}>
        <Page title={title} blocks={blocks} />
      </Panel>
    </PanelGroup>
  );
}

export default App;
