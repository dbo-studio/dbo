import { useCallback } from 'react';
import { useTabStore } from '@/store/tabStore/tab.store';
import { indexedDBService } from '@/services/indexedDB/indexedDB.service';
import type { RowType } from '@/types';

/**
 * Hook for handling unsaved rows operations in the TableData context
 */
export const useTableDataUnsaved = (state: {
  unsavedRows: RowType[];
  setUnsavedRows: (rows: RowType[]) => void;
}) => {
  const { selectedTabId } = useTabStore();
  const { unsavedRows, setUnsavedRows } = state;

  /**
   * Update unsaved rows
   */
  const updateUnsavedRows = useCallback(async (newUnsavedRows: RowType[]): Promise<void> => {
    if (!selectedTabId) return;

    setUnsavedRows(newUnsavedRows);
    // Save to IndexedDB
    await indexedDBService.saveUnsavedRows(selectedTabId, newUnsavedRows);
  }, [selectedTabId, setUnsavedRows]);

  /**
   * Add a single unsaved row
   */
  const addUnsavedRow = useCallback(async (row: RowType): Promise<void> => {
    if (!selectedTabId) return;

    setUnsavedRows(prev => {
      const newUnsavedRows = [...prev, row];
      // Save to IndexedDB in the background
      indexedDBService.saveUnsavedRows(selectedTabId, newUnsavedRows).catch(console.error);
      return newUnsavedRows;
    });
  }, [selectedTabId, setUnsavedRows]);

  return {
    unsavedRows,
    updateUnsavedRows,
    addUnsavedRow
  };
};