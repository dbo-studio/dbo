import { debouncedSaveEditedAndUnsaved } from '@/core/utils/indexdbHelper';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { EditedRow } from '@/types';
import type { StateCreator } from 'zustand';
import type { DataEditedRowsSlice, DataRowSlice, DataStore, DataUnsavedRowsSlice } from '../types';

export const createDataEditedRowsSlice: StateCreator<
  DataStore & DataEditedRowsSlice & DataRowSlice & DataUnsavedRowsSlice,
  [],
  [],
  DataEditedRowsSlice
> = (set, get) => ({
  editedRows: [],
  updateEditedRows: async (editedRows: EditedRow[]): Promise<void> => {
    const selectedTabId = useTabStore.getState().selectedTabId;
    if (!selectedTabId) return Promise.resolve();

    const currentUnsavedRows = [...get().unSavedRows];
    const rowsToKeep: EditedRow[] = [];

    for (const editedRow of editedRows) {
      const isUnsaved = currentUnsavedRows.some((r) => r.dbo_index === editedRow.dboIndex);
      if (isUnsaved) {
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

    set({ editedRows: rowsToKeep });
    get().updateUnsavedRows(currentUnsavedRows);

    debouncedSaveEditedAndUnsaved(selectedTabId, rowsToKeep, currentUnsavedRows);
    return Promise.resolve();
  },
  restoreEditedRows: async (): Promise<void> => {
    const selectedTabId = useTabStore.getState().selectedTabId;
    if (!selectedTabId) return;

    const currentRows = [...(get().rows ?? [])];
    for (const editedRow of get().editedRows) {
      const rowIndex = currentRows.findIndex((r) => r.dbo_index === editedRow.dboIndex);
      if (rowIndex !== -1) {
        currentRows[rowIndex] = {
          ...currentRows[rowIndex],
          ...editedRow.old
        };
      }
    }

    get().updateEditedRows([]);
    get().updateRows(currentRows);

    return Promise.resolve();
  }
});
