import { indexedDBService } from '@/core/indexedDB/indexedDB.service';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { EditedRow, RowType } from '@/types';
import { debounce } from 'lodash';
import { useCallback, useEffect, useRef } from 'react';
import type { TableDataContextType } from './types';

/**
 * Hook for handling edited rows operations in the TableData context
 */
export const useTableDataEdited = (state: {
  rows: RowType[];
  setRows: (rows: RowType[]) => void;
  editedRows: EditedRow[];
  setEditedRows: (rows: EditedRow[]) => void;
  unsavedRows: RowType[];
  setUnsavedRows: (rows: RowType[]) => void;
}): TableDataContextType => {
  const { selectedTabId } = useTabStore();
  const { rows, setRows, editedRows, setEditedRows, unsavedRows, setUnsavedRows } = state;

  // Use refs to keep track of the latest state for the debounced functions
  const rowsRef = useRef<RowType[]>(rows);
  const editedRowsRef = useRef<EditedRow[]>(editedRows);
  const unsavedRowsRef = useRef<RowType[]>(unsavedRows);

  // Update refs when state changes
  useEffect(() => {
    rowsRef.current = rows;
    editedRowsRef.current = editedRows;
    unsavedRowsRef.current = unsavedRows;
  }, [rows, editedRows, unsavedRows]);

  // Create debounced functions to save to IndexedDB
  const debouncedSaveEditedAndUnsaved = useRef(
    debounce(async (tabId: string, editedRowsToSave: EditedRow[], unsavedRowsToSave: RowType[]): Promise<void> => {
      if (!tabId) return;
      try {
        await Promise.all([
          indexedDBService.saveEditedRows(tabId, editedRowsToSave),
          indexedDBService.saveUnsavedRows(tabId, unsavedRowsToSave)
        ]);
      } catch (error) {
        console.error('Error saving edited and unsaved rows to IndexedDB:', error);
      }
    }, 300)
  ).current;

  const debouncedSaveRowsAndEditedRows = useRef(
    debounce(async (tabId: string, rowsToSave: RowType[], editedRowsToSave: EditedRow[]): Promise<void> => {
      if (!tabId) return;
      try {
        await Promise.all([
          indexedDBService.saveRows(tabId, rowsToSave),
          indexedDBService.saveEditedRows(tabId, editedRowsToSave)
        ]);
      } catch (error) {
        console.error('Error saving rows and edited rows to IndexedDB:', error);
      }
    }, 300)
  ).current;

  // Clean up debounced functions on unmount
  useEffect(() => {
    return (): void => {
      debouncedSaveEditedAndUnsaved.cancel();
      debouncedSaveRowsAndEditedRows.cancel();
    };
  }, [debouncedSaveEditedAndUnsaved, debouncedSaveRowsAndEditedRows]);

  /**
   * Update edited rows
   * Updates the UI immediately and defers IndexedDB update
   */
  const updateEditedRows = useCallback(
    async (newEditedRows: EditedRow[]): Promise<void> => {
      if (!selectedTabId) return;

      // Check if any edited rows should be moved to unsaved rows
      const currentUnsavedRows = [...unsavedRowsRef.current];
      const rowsToKeep: EditedRow[] = [];

      for (const editedRow of newEditedRows) {
        const isUnsaved = unsavedRowsRef.current.some((r) => r.dbo_index === editedRow.dboIndex);
        if (isUnsaved) {
          // Move to unsaved rows
          const { dboIndex, ...data } = editedRow;
          const newUnsavedRow = {
            ...data.new,
            dbo_index: dboIndex
          };
          currentUnsavedRows.push(newUnsavedRow);
        } else {
          rowsToKeep.push(editedRow);
        }
      }

      // Update UI immediately
      setEditedRows(rowsToKeep);
      setUnsavedRows(currentUnsavedRows);

      // Schedule IndexedDB update (debounced)
      debouncedSaveEditedAndUnsaved(selectedTabId, rowsToKeep, currentUnsavedRows);

      // Return immediately without waiting for IndexedDB
      return Promise.resolve();
    },
    [selectedTabId, setEditedRows, setUnsavedRows, debouncedSaveEditedAndUnsaved]
  );

  /**
   * Restore edited rows to their original values
   * Updates the UI immediately and defers IndexedDB update
   */
  const restoreEditedRows = useCallback(async (): Promise<void> => {
    if (!selectedTabId) return;

    // Restore original values for edited rows
    const currentRows = [...rowsRef.current];
    for (const editedRow of editedRowsRef.current) {
      const rowIndex = currentRows.findIndex((r) => r.dbo_index === editedRow.dboIndex);
      if (rowIndex !== -1) {
        currentRows[rowIndex] = {
          ...currentRows[rowIndex],
          ...editedRow.old
        };
      }
    }

    // Update UI immediately
    setRows(currentRows);
    setEditedRows([]);

    // Schedule IndexedDB update (debounced)
    debouncedSaveRowsAndEditedRows(selectedTabId, currentRows, []);

    // Return immediately without waiting for IndexedDB
    return Promise.resolve();
  }, [selectedTabId, setRows, setEditedRows, debouncedSaveRowsAndEditedRows]);

  return {
    editedRows,
    updateEditedRows,
    restoreEditedRows
  };
};
