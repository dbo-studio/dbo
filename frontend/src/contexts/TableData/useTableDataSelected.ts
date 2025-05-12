import { useCallback, useRef, useEffect } from 'react';
import { useTabStore } from '@/store/tabStore/tab.store';
import { indexedDBService } from '@/services/indexedDB/indexedDB.service';
import type { SelectedRow } from '@/store/dataStore/types';
import { debounce } from 'lodash';

/**
 * Hook for handling selected rows operations in the TableData context
 */
export const useTableDataSelected = (state: {
  selectedRows: SelectedRow[];
  setSelectedRowsState: (rows: SelectedRow[]) => void;
}) => {
  const { selectedTabId } = useTabStore();
  const { selectedRows, setSelectedRowsState } = state;

  // Use a ref to keep track of the latest selected rows for the debounced function
  const selectedRowsRef = useRef<SelectedRow[]>(selectedRows);

  // Update the ref when selectedRows changes
  useEffect(() => {
    selectedRowsRef.current = selectedRows;
  }, [selectedRows]);

  // Create a debounced function to save to IndexedDB
  // This will only execute after 300ms of inactivity
  const debouncedSaveToIndexedDB = useRef(
    debounce(async (tabId: string, rows: SelectedRow[]): Promise<void> => {
      if (!tabId) return;
      try {
        await indexedDBService.saveSelectedRows(tabId, rows);
      } catch (error) {
        console.error('Error saving selected rows to IndexedDB:', error);
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
   * Set selected rows
   * Updates the UI immediately and defers IndexedDB update
   */
  const setSelectedRows = useCallback(async (newSelectedRows: SelectedRow[]): Promise<void> => {
    if (!selectedTabId) return;

    // Update UI immediately
    setSelectedRowsState(newSelectedRows);

    // Schedule IndexedDB update (debounced)
    debouncedSaveToIndexedDB(selectedTabId, newSelectedRows);

    // Return immediately without waiting for IndexedDB
    return Promise.resolve();
  }, [selectedTabId, setSelectedRowsState, debouncedSaveToIndexedDB]);

  return {
    selectedRows,
    setSelectedRows
  };
};
