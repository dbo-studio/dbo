import { indexedDBService } from '@/core/indexedDB/indexedDB.service';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { ColumnType } from '@/types';
import { debounce } from 'lodash';
import { useCallback, useEffect, useRef } from 'react';
import type { TableDataContextType } from './types';

/**
 * Hook for handling column operations in the TableData context
 */
export const useTableDataColumns = (state: {
  columns: ColumnType[];
  setColumns: (columns: ColumnType[]) => void;
}): TableDataContextType => {
  const { selectedTabId } = useTabStore();
  const { columns, setColumns } = state;

  // Use a ref to keep track of the latest columns for the debounced function
  const columnsRef = useRef<ColumnType[]>(columns);

  // Update the ref when columns changes
  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  // Create a debounced function to save to IndexedDB
  // This will only execute after 300ms of inactivity
  const debouncedSaveColumns = useRef(
    debounce(async (tabId: string, columnsToSave: ColumnType[]): Promise<void> => {
      if (!tabId) return;
      try {
        await indexedDBService.saveColumns(tabId, columnsToSave);
      } catch (error) {
        console.error('Error saving columns to IndexedDB:', error);
      }
    }, 300)
  ).current;

  // Clean up the debounced function on unmount
  useEffect(() => {
    return (): void => {
      debouncedSaveColumns.cancel();
    };
  }, [debouncedSaveColumns]);

  /**
   * Update columns
   * Updates the UI immediately and defers IndexedDB update
   */
  const updateColumns = useCallback(
    async (newColumns: ColumnType[]): Promise<void> => {
      if (!selectedTabId) return;

      // Update UI immediately
      setColumns(newColumns);

      // Schedule IndexedDB update (debounced)
      debouncedSaveColumns(selectedTabId, newColumns);

      // Return immediately without waiting for IndexedDB
      return Promise.resolve();
    },
    [selectedTabId, setColumns, debouncedSaveColumns]
  );

  /**
   * Get active columns (columns with isActive=true)
   */
  const getActiveColumns = useCallback((): ColumnType[] => {
    return columns.filter((c) => c.isActive);
  }, [columns]);

  return {
    columns,
    updateColumns,
    getActiveColumns
  };
};
