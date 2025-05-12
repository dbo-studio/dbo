import { useCallback } from 'react';
import { useTabStore } from '@/store/tabStore/tab.store';
import { indexedDBService } from '@/services/indexedDB/indexedDB.service';
import type { RowType } from '@/types';

/**
 * Hook for handling row operations in the TableData context
 */
export const useTableDataRows = (state: {
  rows: RowType[];
  setRows: (rows: RowType[]) => void;
}) => {
  const { selectedTabId } = useTabStore();
  const { rows, setRows } = state;

  /**
   * Update a single row
   */
  const updateRow = useCallback(async (row: RowType): Promise<void> => {
    if (!selectedTabId) return;

    setRows(prevRows => {
      const newRows = prevRows.map(r => r.dbo_index === row.dbo_index ? row : r);
      // Save to IndexedDB in the background
      indexedDBService.saveRows(selectedTabId, newRows).catch(console.error);
      return newRows;
    });
  }, [selectedTabId, setRows]);

  /**
   * Update multiple rows
   */
  const updateRows = useCallback(async (newRows: RowType[]): Promise<void> => {
    if (!selectedTabId) return;

    setRows(newRows);
    // Save to IndexedDB
    await indexedDBService.saveRows(selectedTabId, newRows);
  }, [selectedTabId, setRows]);

  return {
    rows,
    updateRow,
    updateRows
  };
};