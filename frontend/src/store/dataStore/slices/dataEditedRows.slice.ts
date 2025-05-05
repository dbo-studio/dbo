import { useTabStore } from '@/store/tabStore/tab.store';
import type { EditedRow, RowType } from '@/types';
import { pullAt } from 'lodash';
import type { StateCreator } from 'zustand';
import type { DataEditedRowsSlice, DataRowSlice, DataStore, DataUnsavedRowsSlice } from '../types';

const tabId = (): string => {
  return useTabStore.getState().selectedTabId ?? '';
};

export const createDataEditedRowsSlice: StateCreator<
  DataStore & DataEditedRowsSlice & DataRowSlice & DataUnsavedRowsSlice,
  [],
  [],
  DataEditedRowsSlice
> = (set, get) => ({
  editedRows: {},
  getEditedRows: (): EditedRow[] => {
    const selectedTabId = tabId();
    if (!selectedTabId) return [];

    const rows = get().editedRows;
    return rows[selectedTabId] ?? [];
  },
  updateEditedRows: (editedRows: EditedRow[]): void => {
    const selectedTabId = tabId();
    if (!selectedTabId) return;

    const unSavedRows = get().getUnsavedRows();
    const shouldBeUnsaved: RowType[] = [];

    editedRows.forEach((editedRow: EditedRow, index: number) => {
      const findValueIndex = unSavedRows.findIndex((x) => x.dbo_index === editedRow.dboIndex);
      if (findValueIndex > -1) {
        shouldBeUnsaved.push(...pullAt(editedRows, [index]));
      }
    });

    //  if row exists in unsaved'rows, it should not push into edited'rows list
    for (const unSavedRow of shouldBeUnsaved) {
      const { dboIndex, ...data } = unSavedRow;
      const newUnsavedRow = {
        ...data.new,
        dbo_index: dboIndex
      };
      get().addUnsavedRows(newUnsavedRow);
    }

    const rows = get().editedRows;
    rows[selectedTabId] = editedRows;
    set({ editedRows: rows });
  },
  restoreEditedRows: async (): Promise<void> => {
    const newRows = get().getEditedRows();
    const oldRows = get().getRows();

    for (const newRow of newRows) {
      const findValueIndex = oldRows.findIndex((x) => x.dbo_index === newRow.dboIndex);
      oldRows[findValueIndex] = {
        ...oldRows[findValueIndex],
        ...newRow.old
      };
    }

    await get().updateRows(oldRows);
    get().updateEditedRows([]);
  },
  removeEditedRowsByTabId: (tabId: string): void => {
    set((state) => ({
      editedRows: Object.fromEntries(Object.entries(state.editedRows).filter(([key]) => key !== tabId))
    }));
  }
});
