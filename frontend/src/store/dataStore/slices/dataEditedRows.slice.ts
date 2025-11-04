import { debouncedSaveEditedAndUnsaved } from '@/core/utils/indexdbHelper';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { EditedRow } from '@/types';
import type { StateCreator } from 'zustand';
import type { DataEditedRowsSlice, DataRowSlice, DataStore, DataUnsavedRowsSlice } from '../types';

export const createDataEditedRowsSlice: StateCreator<
  DataStore & DataEditedRowsSlice & DataRowSlice & DataUnsavedRowsSlice,
  [['zustand/devtools', never]],
  [],
  DataEditedRowsSlice
> = (set, get) => ({
  editedRows: [],
  updateEditedRows: async (editedRows: EditedRow[]): Promise<void> => {
    const selectedTabId = useTabStore.getState().selectedTabId;
    if (!selectedTabId) return Promise.resolve();

    let currentUnsavedRows = [...get().unSavedRows];
    const rowsToKeep: EditedRow[] = [];

    for (const editedRow of editedRows) {
      const isUnsavedRow = currentUnsavedRows.some((r) => r.dbo_index === editedRow.dboIndex);
      if (!isUnsavedRow) {
        rowsToKeep.push(editedRow);
        continue;
      }

      currentUnsavedRows = currentUnsavedRows.map((r) => {
        if (r.dbo_index === editedRow.dboIndex) {
          const { dboIndex, ...data } = editedRow;
          return {
            ...r,
            ...data.new,
            dbo_index: dboIndex
          };
        }
        return r;
      });
    }

    set({ editedRows: rowsToKeep }, undefined, 'updateEditedRows');
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
