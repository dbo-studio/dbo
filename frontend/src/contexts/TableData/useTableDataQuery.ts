import { useCallback, useRef, useEffect } from 'react';
import { useTabStore } from '@/store/tabStore/tab.store';
import { indexedDBService } from '@/services/indexedDB/indexedDB.service';
import { runQuery, runRawQuery } from '@/api/query';
import type { RunQueryResponseType } from '@/api/query/types';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { toast } from 'sonner';
import { isAxiosError } from 'axios';
import { debounce } from 'lodash';

/**
 * Hook for handling query operations in the TableData context
 */
export const useTableDataQuery = (state: {
  setRows: (rows: any[]) => void;
  setColumns: (columns: any[]) => void;
  setIsLoading: (isLoading: boolean) => void;
}) => {
  const { selectedTabId } = useTabStore();
  const { setRows, setColumns, setIsLoading } = state;

  // Create a debounced function to save to IndexedDB
  // This will only execute after 300ms of inactivity
  const debouncedSaveToIndexedDB = useRef(
    debounce(async (
      tabId: string, 
      rowsToSave: any[], 
      columnsToSave: any[]
    ): Promise<void> => {
      if (!tabId) return;
      try {
        await Promise.all([
          indexedDBService.saveRows(tabId, rowsToSave),
          indexedDBService.saveColumns(tabId, columnsToSave)
        ]);
      } catch (error) {
        console.error('Error saving data to IndexedDB:', error);
      }
    }, 300)
  ).current;

  // Clean up the debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedSaveToIndexedDB.cancel();
    };
  }, [debouncedSaveToIndexedDB]);

  /**
   * Fetch data from server
   */
  const fetchDataFromServer = useCallback(async (): Promise<RunQueryResponseType | undefined> => {
    if (!selectedTabId) return undefined;

    try {
      setIsLoading(true);
      const tab = useTabStore.getState().selectedTab();
      if (!tab) return undefined;

      const filters = tab.filters ?? [];
      const sorts = tab.sorts ?? [];

      const result = await runQuery({
        connectionId: Number(tab.connectionId),
        nodeId: tab.nodeId,
        limit: tab.pagination?.limit ?? 100,
        page: tab.pagination?.page ?? 1,
        columns: tab.columns ?? [],
        filters: filters.filter(
          (f) =>
            f.column.length > 0 &&
            f.operator.length > 0 &&
            f.value.toString().length > 0 &&
            f.next.length > 0 &&
            f.isActive
        ),
        sorts: sorts.filter((f) => f.column.length > 0 && f.operator.length > 0 && f.isActive)
      });

      useTabStore.getState().updateQuery(result.query);

      // Update state immediately
      setRows(result.data);
      setColumns(result.columns);

      // Schedule IndexedDB update (debounced)
      debouncedSaveToIndexedDB(selectedTabId, result.data, result.columns);

      return result;
    } catch (error) {
      console.error('Error fetching data from server:', error);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, [selectedTabId, setRows, setColumns, setIsLoading, debouncedSaveToIndexedDB]);

  /**
   * Execute a query
   */
  const executeQuery = useCallback(async (): Promise<RunQueryResponseType | undefined> => {
    return await fetchDataFromServer();
  }, [fetchDataFromServer]);

  /**
   * Execute a raw query
   */
  const executeRawQuery = useCallback(async (query?: string): Promise<RunQueryResponseType | undefined> => {
    if (!selectedTabId) return undefined;

    try {
      setIsLoading(true);
      const currentConnectionId = useConnectionStore.getState().currentConnectionId;
      if (!currentConnectionId) return undefined;

      const result = await runRawQuery({
        connectionId: Number(currentConnectionId),
        query: query ? query : useTabStore.getState().getQuery()
      });

      useTabStore.getState().updateQuery(result.query);

      // Update state immediately
      setRows(result.data);
      setColumns(result.columns);

      // Schedule IndexedDB update (debounced)
      debouncedSaveToIndexedDB(selectedTabId, result.data, result.columns);

      return result;
    } catch (error) {
      if (isAxiosError(error)) {
        toast.error(error.message);
      }
      console.error('Error executing raw query:', error);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, [selectedTabId, setRows, setColumns, setIsLoading, debouncedSaveToIndexedDB]);

  /**
   * Refresh data from server
   */
  const refreshDataFromServer = useCallback(async (): Promise<void> => {
    await fetchDataFromServer();
  }, [fetchDataFromServer]);

  return {
    fetchDataFromServer,
    runQuery: executeQuery,
    runRawQuery: executeRawQuery,
    refreshDataFromServer
  };
};
