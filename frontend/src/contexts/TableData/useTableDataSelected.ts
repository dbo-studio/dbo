import { useCallback } from 'react';
import { useTabStore } from '@/store/tabStore/tab.store';
import { indexedDBService } from '@/services/indexedDB/indexedDB.service';
import type { SelectedRow } from '@/store/dataStore/types';

/**
 * Hook for handling selected rows operations in the TableData context
 */
export const useTableDataSelected = (state: {
  selectedRows: SelectedRow[];
  setSelectedRowsState: (rows: SelectedRow[]) => void;
}) => {
  const { selectedTabId } = useTabStore();
  const { selectedRows, setSelectedRowsState } = state;

  /**
   * Set selected rows
   */
  const setSelectedRows = useCallback(async (newSelectedRows: SelectedRow[]): Promise<void> => {
    if (!selectedTabId) return;

    setSelectedRowsState(newSelectedRows);
    // Save to IndexedDB
    await indexedDBService.saveSelectedRows(selectedTabId, newSelectedRows);
  }, [selectedTabId, setSelectedRowsState]);

  return {
    selectedRows,
    setSelectedRows
  };
};