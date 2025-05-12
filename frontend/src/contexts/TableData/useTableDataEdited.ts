import { useCallback } from 'react';
import { useTabStore } from '@/store/tabStore/tab.store';
import { indexedDBService } from '@/services/indexedDB/indexedDB.service';
import type { RowType, EditedRow } from '@/types';

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
}) => {
  const { selectedTabId } = useTabStore();
  const { rows, setRows, editedRows, setEditedRows, unsavedRows, setUnsavedRows } = state;

  /**
   * Update edited rows
   */
  const updateEditedRows = useCallback(async (newEditedRows: EditedRow[]): Promise<void> => {
    if (!selectedTabId) return;

    // Check if any edited rows should be moved to unsaved rows
    const currentUnsavedRows = [...unsavedRows];
    const rowsToKeep: EditedRow[] = [];

    for (const editedRow of newEditedRows) {
      const isUnsaved = unsavedRows.some(r => r.dbo_index === editedRow.dboIndex);
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

    // Update state
    setEditedRows(rowsToKeep);
    setUnsavedRows(currentUnsavedRows);

    // Save to IndexedDB
    await Promise.all([
      indexedDBService.saveEditedRows(selectedTabId, rowsToKeep),
      indexedDBService.saveUnsavedRows(selectedTabId, currentUnsavedRows)
    ]);
  }, [selectedTabId, setEditedRows, unsavedRows, setUnsavedRows]);

  /**
   * Restore edited rows to their original values
   */
  const restoreEditedRows = useCallback(async (): Promise<void> => {
    if (!selectedTabId) return;

    // Restore original values for edited rows
    const currentRows = [...rows];
    for (const editedRow of editedRows) {
      const rowIndex = currentRows.findIndex(r => r.dbo_index === editedRow.dboIndex);
      if (rowIndex !== -1) {
        currentRows[rowIndex] = {
          ...currentRows[rowIndex],
          ...editedRow.old
        };
      }
    }

    // Update state
    setRows(currentRows);
    setEditedRows([]);

    // Save to IndexedDB
    await Promise.all([
      indexedDBService.saveRows(selectedTabId, currentRows),
      indexedDBService.saveEditedRows(selectedTabId, [])
    ]);
  }, [selectedTabId, rows, editedRows, setRows, setEditedRows]);

  return {
    editedRows,
    updateEditedRows,
    restoreEditedRows
  };
};