import { useCallback, useRef, useEffect } from 'react';
import { useTabStore } from '@/store/tabStore/tab.store';
import { indexedDBService } from '@/services/indexedDB/indexedDB.service';
import type { RowType } from '@/types';
import { debounce } from 'lodash';

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

  // Use refs to keep track of the latest state for the debounced functions
  const rowsRef = useRef<RowType[]>(rows);
  const removedRowsRef = useRef<RowType[]>(removedRows);

  // Update refs when state changes
  useEffect(() => {
    rowsRef.current = rows;
    removedRowsRef.current = removedRows;
  }, [rows, removedRows]);

  // Create debounced functions to save to IndexedDB
  const debouncedSaveRemovedRows = useRef(
    debounce(async (tabId: string, removedRowsToSave: RowType[]): Promise<void> => {
      if (!tabId) return;
      try {
        await indexedDBService.saveRemovedRows(tabId, removedRowsToSave);
      } catch (error) {
        console.error('Error saving removed rows to IndexedDB:', error);
      }
    }, 300)
  ).current;

  const debouncedSaveRowsAndRemovedRows = useRef(
    debounce(async (
      tabId: string, 
      rowsToSave: RowType[], 
      removedRowsToSave: RowType[]
    ): Promise<void> => {
      if (!tabId) return;
      try {
        await Promise.all([
          indexedDBService.saveRows(tabId, rowsToSave),
          indexedDBService.saveRemovedRows(tabId, removedRowsToSave)
        ]);
      } catch (error) {
        console.error('Error saving rows and removed rows to IndexedDB:', error);
      }
    }, 300)
  ).current;

  // Clean up debounced functions on unmount
  useEffect(() => {
    return () => {
      debouncedSaveRemovedRows.cancel();
      debouncedSaveRowsAndRemovedRows.cancel();
    };
  }, [debouncedSaveRemovedRows, debouncedSaveRowsAndRemovedRows]);

  /**
   * Update removed rows
   * Updates the UI immediately and defers IndexedDB update
   */
  const updateRemovedRows = useCallback(async (newRemovedRows: RowType[]): Promise<void> => {
    if (!selectedTabId) return;

    // Update UI immediately
    setRemovedRows(newRemovedRows);

    // Schedule IndexedDB update (debounced)
    debouncedSaveRemovedRows(selectedTabId, newRemovedRows);

    // Return immediately without waiting for IndexedDB
    return Promise.resolve();
  }, [selectedTabId, setRemovedRows, debouncedSaveRemovedRows]);

  /**
   * Delete removed rows permanently
   * Updates the UI immediately and defers IndexedDB update
   */
  const deleteRemovedRows = useCallback(async (): Promise<void> => {
    if (!selectedTabId) return;

    // Filter out removed rows from the current rows
    const currentRows = rowsRef.current.filter(row => 
      !removedRowsRef.current.some(r => r.dbo_index === row.dbo_index)
    );

    // Update UI immediately
    setRows(currentRows);
    setRemovedRows([]);

    // Schedule IndexedDB update (debounced)
    debouncedSaveRowsAndRemovedRows(selectedTabId, currentRows, []);

    // Return immediately without waiting for IndexedDB
    return Promise.resolve();
  }, [selectedTabId, setRows, setRemovedRows, debouncedSaveRowsAndRemovedRows]);

  return {
    removedRows,
    updateRemovedRows,
    deleteRemovedRows
  };
};
