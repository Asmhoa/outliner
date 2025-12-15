import { useState, useCallback, useEffect } from "react";
import { useDatabase } from "./useDatabase";
import apiService from "../services";
import {
  type Page as PageType,
  type HTTPError
} from "../api-client";
import { showNotification } from "@mantine/notifications";
import log from "../utils/logger";

interface UsePageDataReturn {
  pages: PageType[];
  currentPageId: string | null;
  currentPageTitle: string;
  setCurrentPageId: (id: string | null) => void;
  fetchPages: () => Promise<void>;
  handleAddPage: (title: string) => Promise<string | undefined>;
  handleDeletePage: (page_id: string) => Promise<void>;
  handleRenamePage: (page_id: string, new_title: string) => Promise<boolean>;
}

export const usePageData = (): UsePageDataReturn => {
  const { dbId } = useDatabase();
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [currentPageTitle, setCurrentPageTitle] = useState("");
  const [pages, setPages] = useState<PageType[]>([]);

  const fetchPages = useCallback(async () => {
    if (!dbId) return;
    log.debug("[usePageData] Fetching pages...");
    const { data, error } = await apiService.getPages(dbId);
    if (error) {
      log.error("[usePageData] Failed to fetch pages:", error);
      return;
    }
    if (data) {
      log.debug(`[usePageData] Fetched ${data.length} pages`);
      setPages(data);
    }
  }, [dbId]);

  const refreshCurrentPage = useCallback(async () => {
    if (!dbId || !currentPageId) return;

    const { data, error } = await apiService.getPage(dbId, currentPageId);

    if (error) {
      log.error("[usePageData] Failed to fetch page title:", error);
      return;
    }

    if (data?.title) {
      setCurrentPageTitle(data.title);
    }
  }, [dbId, currentPageId]);

  const handleDeletePage = async (page_id: string) => {
    if (!dbId) return;
    log.debug(`[usePageData] Deleting page`, { page_id });
    const { error } = await apiService.deletePage(dbId, page_id);

    if (error) {
      log.error("[usePageData] Failed to delete page:", error);
      return;
    }

    fetchPages();
    if (currentPageId === page_id) {
      setCurrentPageId(null);
      setCurrentPageTitle("");
    }
  };

  const handleAddPage = async (title: string) => {
    if (!dbId) return;
    log.debug(`[usePageData] Adding new page`, { title });
    const { data, error, response } = await apiService.addPage(dbId, title);

    if (error) {
      if (response?.status === 409) {
        const httpError = error as HTTPError;
        const errorMessage = (httpError.body as { detail: string }).detail || "A page with this title already exists.";
        log.error(errorMessage);
        showNotification({
          title: "Failed to add page",
          message: errorMessage,
          color: "red",
          autoClose: false,
        });
      } else {
        log.error("[usePageData] Failed to add page:", error);
      }
      return;
    }

    await fetchPages();
    // Switch to the newly created page
    if (data && data.page_id) {
      setCurrentPageId(data.page_id);
      return data.page_id;
    }
  };

  const handleRenamePage = async (page_id: string, new_title: string) => {
    if (!dbId) return false;
    log.debug(`[usePageData] Renaming page`, { page_id, new_title });
    const { error, response } = await apiService.renamePage(dbId, page_id, new_title);

    if (error) {
      if (response?.status === 409) {
        const httpError = error as HTTPError;
        const errorMessage = (httpError.body as { detail: string }).detail || "A page with this title already exists.";
        log.error(errorMessage);
        showNotification({
          title: "Failed to rename page",
          message: errorMessage,
          color: "red",
        });
      } else {
        log.error("[usePageData] Failed to rename page:", error);
      }
      return false;
    }

    // Update the local state to reflect the change
    setPages(prevPages =>
      prevPages.map(page =>
        page.page_id === page_id ? { ...page, title: new_title } : page
      )
    );

    if (currentPageId === page_id) {
      setCurrentPageTitle(new_title);
    }

    return true;
  };

  useEffect(() => {
    if (!dbId) return;
    const fetchTitle = async () => {
      if (!currentPageId) return;
      const { data, error } = await apiService.getPage(dbId, currentPageId);

      if (error) {
        log.error("[usePageData] Failed to fetch page title:", error);
        return;
      }

      if (data?.title) {
        setCurrentPageTitle(data.title);
      }
    };
    fetchTitle();
  }, [currentPageId, dbId]);

  return {
    pages,
    currentPageId,
    currentPageTitle,
    setCurrentPageId,
    fetchPages,
    handleAddPage,
    handleDeletePage,
    handleRenamePage
  };
};