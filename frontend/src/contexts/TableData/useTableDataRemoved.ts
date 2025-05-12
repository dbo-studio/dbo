import { useCallback } from 'react';
import { useTabStore } from '@/store/tabStore/tab.store';
import { indexedDBService } from '@/services/indexedDB/indexedDB.service';
import type { RowType } from '@/types';

/**
 * Hook for handling removed rows operations in the TableData context
 */
export const useTableDataRemoved = (state: {
  rows: RowType[];
  setRows: (rows: RowType[]) => void;
  removedRows: RowType[];
  setRemovedRows: (rows: RowType[]) => void;
}) => {
  const { selectedTabId } = useTabStore();
  const { rows, setRows, removedRows, setRemovedRows } = state;

  /**
   * Update removed rows
   */
  const updateRemovedRows = useCallback(async (newRemovedRows: RowType[]): Promise<void> => {
    if (!selectedTabId) return;

    setRemovedRows(newRemovedRows);
    // Save to IndexedDB
    await indexedDBService.saveRemovedRows(selectedTabId, newRemovedRows);
  }, [selectedTabId, setRemovedRows]);

  /**
   * Delete removed rows permanently
   */
  const deleteRemovedRows = useCallback(async (): Promise<void> => {
    if (!selectedTabId) return;

    // Filter out removed rows from the current rows
    const currentRows = rows.filter(row => !removedRows.some(r => r.dbo_index === row.dbo_index));

    // Update state
    setRows(currentRows);
    setRemovedRows([]);

    // Save to IndexedDB
    await Promise.all([
      indexedDBService.saveRows(selectedTabId, currentRows),
      indexedDBService.saveRemovedRows(selectedTabId, [])
    ]);
  }, [selectedTabId, rows, removedRows, setRows, setRemovedRows]);

  return {
    removedRows,
    updateRemovedRows,
    deleteRemovedRows
  };
};