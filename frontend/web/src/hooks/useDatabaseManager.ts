import { useState, useCallback, useEffect } from "react";
import { useDatabase } from "./useDatabase";
import {
  getDatabasesDatabasesGet,
  getWorkspacesDbDbIdWorkspacesGet,
  createDatabaseDatabasesPost,
  type Database as DatabaseType,
  type Workspace,
  type HTTPError
} from "../api-client";
import { showNotification } from "@mantine/notifications";
import log from "../utils/logger";

interface UseDatabaseManagerReturn {
  databases: { value: string; label: string }[];
  workspaces: Workspace[];
  setWorkspaces: React.Dispatch<React.SetStateAction<Workspace[]>>;
  activeWorkspaceId: number | null;
  setActiveWorkspaceId: (id: number | null) => void;
  fetchDatabases: () => Promise<void>;
  fetchWorkspaces: () => Promise<void>;
  createDatabase: (name: string) => Promise<string | undefined>;
  switchDatabase: (dbId: string) => void;
  refreshDataOnDatabaseSwitch: () => Promise<void>;
  isDatabasesLoading: boolean;
}

export const useDatabaseManager = (): UseDatabaseManagerReturn => {
  const { dbId, setDbId } = useDatabase();
  const [databases, setDatabases] = useState<{ value: string; label: string }[]>([]);
  const [workspaces, setWorkspacesState] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);
  const [isDatabasesLoading, setIsDatabasesLoading] = useState(true);

  const fetchDatabases = useCallback(async () => {
    setIsDatabasesLoading(true);
    const { data, error } = await getDatabasesDatabasesGet();
    if (error) {
      log.error("[useDatabaseManager] Failed to fetch databases:", error);
      setIsDatabasesLoading(false);
      return;
    }

    if (data) {
      setDatabases(data.map((db: DatabaseType) => ({
        value: db.id,
        label: db.name
      })));
    }
    setIsDatabasesLoading(false);
  }, []);

  const fetchWorkspaces = useCallback(async () => {
    if (!dbId) return;
    const { data: all_workspaces, error } = await getWorkspacesDbDbIdWorkspacesGet({
      path: { db_id: dbId },
    });
    
    if (error) {
      log.error("[useDatabaseManager] Failed to fetch workspaces:", error);
      return;
    }

    if (all_workspaces) {
      // Structure default first then most recent
      const sorted_workspaces = [
        all_workspaces[0],
        ...all_workspaces.slice(1).reverse(),
      ];
      setWorkspacesState(sorted_workspaces as Workspace[]);
      if (activeWorkspaceId === null) {
        setActiveWorkspaceId(0);
      }
    }
  }, [dbId, activeWorkspaceId]);

  const createDatabase = async (name: string) => {
    log.debug(`[useDatabaseManager] Creating database`, { name });
    const { data, error, response } = await createDatabaseDatabasesPost({
      body: { name }
    });

    if (error) {
      if (response.status === 409) {
        const httpError = error as HTTPError;
        const errorMessage = (httpError.body as { detail: string }).detail || "A database with this name already exists.";
        log.error(errorMessage);
        showNotification({
          title: "Failed to create database",
          message: errorMessage,
          color: "red",
          autoClose: false,
        });
      } else {
        log.error("[useDatabaseManager] Failed to create database:", error);
      }
      return undefined;
    }

    if (data && data.id) {
      await fetchDatabases(); // Refresh the list after creating
      return data.id;
    }

    return undefined;
  };

  const switchDatabase = (newDbId: string) => {
    setDbId(newDbId);
  };

  const refreshDataOnDatabaseSwitch = useCallback(async () => {
    if (dbId) {
      log.debug(`[useDatabaseManager] dbId changed to ${dbId}, re-fetching data`);
      await fetchWorkspaces();
      // We don't fetch pages here since that's handled by the page hook
    }
  }, [dbId, fetchWorkspaces]);

  useEffect(() => {
    fetchDatabases();
  }, [fetchDatabases]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  useEffect(() => {
    // Update everything on DB change
    if (dbId) {
      refreshDataOnDatabaseSwitch();
    }
  }, [dbId, refreshDataOnDatabaseSwitch]);

  return {
    databases,
    workspaces,
    setWorkspaces: setWorkspacesState,
    activeWorkspaceId,
    setActiveWorkspaceId,
    fetchDatabases,
    fetchWorkspaces,
    createDatabase,
    switchDatabase,
    refreshDataOnDatabaseSwitch,
    isDatabasesLoading
  };
};