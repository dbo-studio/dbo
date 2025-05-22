import { indexedDBService } from '@/core/indexedDB/indexedDB.service';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { RowType } from '@/types';
import { debounce } from 'lodash';
import { useCallback, useEffect, useRef } from 'react';
import type { TableDataContextType, TableDataState } from './types';

/**
 * Hook for handling unsaved rows operations in the TableData context
 */
export const useTableDataUnsaved = (state: TableDataState): TableDataContextType => {
  const { selectedTabId } = useTabStore();
  const { unsavedRows, setUnsavedRows } = state;

  // Use a ref to keep track of the latest unsaved rows for the debounced function
  const unsavedRowsRef = useRef<RowType[]>(unsavedRows);

  // Update the ref when unsavedRows changes
  useEffect(() => {
    unsavedRowsRef.current = unsavedRows;
  }, [unsavedRows]);

  // Create a debounced function to save to IndexedDB
  // This will only execute after 300ms of inactivity
  const debouncedSaveUnsavedRows = useRef(
    debounce(async (tabId: string, unsavedRowsToSave: RowType[]): Promise<void> => {
      if (!tabId) return;
      try {
        await indexedDBService.saveUnsavedRows(tabId, unsavedRowsToSave);
      } catch (error) {
        console.error('Error saving unsaved rows to IndexedDB:', error);
      }
    }, 300)
  ).current;

  // Clean up the debounced function on unmount
  useEffect(() => {
    return (): void => {
      debouncedSaveUnsavedRows.cancel();
    };
  }, [debouncedSaveUnsavedRows]);

  /**
   * Update unsaved rows
   * Updates the UI immediately and defers IndexedDB update
   */
  const updateUnsavedRows = useCallback(
    async (newUnsavedRows: RowType[]): Promise<void> => {
      if (!selectedTabId) return;

      // Update UI immediately
      setUnsavedRows(newUnsavedRows);

      // Schedule IndexedDB update (debounced)
      debouncedSaveUnsavedRows(selectedTabId, newUnsavedRows);

      // Return immediately without waiting for IndexedDB
      return Promise.resolve();
    },
    [selectedTabId, setUnsavedRows, debouncedSaveUnsavedRows]
  );

  /**
   * Add a single unsaved row
   * Updates the UI immediately and defers IndexedDB update
   */
  const addUnsavedRow = useCallback(
    async (row: RowType): Promise<void> => {
      if (!selectedTabId) return;

      setUnsavedRows((prev) => {
        const newUnsavedRows = [...prev, row];
        // Schedule IndexedDB update (debounced)
        debouncedSaveUnsavedRows(selectedTabId, newUnsavedRows);
        return newUnsavedRows;
      });

      // Return immediately without waiting for IndexedDB
      return Promise.resolve();
    },
    [selectedTabId, setUnsavedRows, debouncedSaveUnsavedRows]
  );

  return {
    unsavedRows,
    updateUnsavedRows,
    addUnsavedRow
  };
};
