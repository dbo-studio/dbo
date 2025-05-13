import { indexedDBService } from '@/core/indexedDB/indexedDB.service';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { RowType } from '@/types';
import { debounce } from 'lodash';
import { useCallback, useEffect, useRef } from 'react';
import type { TableDataContextType } from './types';

/**
 * Hook for handling row operations in the TableData context
 */
export const useTableDataRows = (state: {
  rows: RowType[];
  setRows: (rows: RowType[]) => void;
}): TableDataContextType => {
  const { selectedTabId } = useTabStore();
  const { rows, setRows } = state;

  // Use a ref to keep track of the latest rows for the debounced function
  const rowsRef = useRef<RowType[]>(rows);

  // Update the ref when rows changes
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  // Create a debounced function to save to IndexedDB
  // This will only execute after 300ms of inactivity
  const debouncedSaveRows = useRef(
    debounce(async (tabId: string, rowsToSave: RowType[]): Promise<void> => {
      if (!tabId) return;
      try {
        await indexedDBService.saveRows(tabId, rowsToSave);
      } catch (error) {
        console.error('Error saving rows to IndexedDB:', error);
      }
    }, 300)
  ).current;

  // Clean up the debounced function on unmount
  useEffect(() => {
    return (): void => {
      debouncedSaveRows.cancel();
    };
  }, [debouncedSaveRows]);

  /**
   * Update a single row
   * Updates the UI immediately and defers IndexedDB update
   */
  const updateRow = useCallback(
    async (row: RowType): Promise<void> => {
      if (!selectedTabId) return;

      setRows((prevRows) => {
        const newRows = prevRows.map((r) => (r.dbo_index === row.dbo_index ? row : r));
        // Schedule IndexedDB update (debounced)
        debouncedSaveRows(selectedTabId, newRows);
        return newRows;
      });

      // Return immediately without waiting for IndexedDB
      return Promise.resolve();
    },
    [selectedTabId, setRows, debouncedSaveRows]
  );

  /**
   * Update multiple rows
   * Updates the UI immediately and defers IndexedDB update
   */
  const updateRows = useCallback(
    async (newRows: RowType[]): Promise<void> => {
      if (!selectedTabId) return;

      // Update UI immediately
      setRows(newRows);

      // Schedule IndexedDB update (debounced)
      debouncedSaveRows(selectedTabId, newRows);

      // Return immediately without waiting for IndexedDB
      return Promise.resolve();
    },
    [selectedTabId, setRows, debouncedSaveRows]
  );

  return {
    rows,
    updateRow,
    updateRows
  };
};
