import type { EditedRow, RowType, TabType } from '@/types';
import { pullAt } from 'lodash';
import type { StateCreator } from 'zustand';
import type { DataEditedRowsSlice, DataRowSlice, DataStore, DataUnsavedRowsSlice } from '../types';

export const createDataEditedRowsSlice: StateCreator<
  DataStore & DataEditedRowsSlice & DataRowSlice & DataUnsavedRowsSlice,
  [],
  [],
  DataEditedRowsSlice
> = (set, get) => ({
  editedRows: {},
  getEditedRows: (tab: TabType | undefined): EditedRow[] => {
    if (!tab) return [];

    const rows = get().editedRows;
    return rows[tab?.id as string] ?? [];
  },
  updateEditedRows: (tab: TabType, editedRows: EditedRow[]): void => {
    const unSavedRows = get().getUnsavedRows(tab);
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
    rows[tab.id] = editedRows;
    set({ editedRows: rows });
  },
  restoreEditedRows: async (tab: TabType): Promise<void> => {
    const newRows = get().getEditedRows(tab);
    const oldRows = get().getRows(tab);

    for (const newRow of newRows) {
      const findValueIndex = oldRows.findIndex((x) => x.dbo_index === newRow.dboIndex);
      oldRows[findValueIndex] = {
        ...oldRows[findValueIndex],
        ...newRow.old
      };
    }

    await get().updateRows(tab, oldRows);
    get().updateEditedRows(tab, []);
  },
  removeEditedRowsByTabId: (tabId: string): void => {
    const rows = get().editedRows;
    delete rows[tabId];
    set({ editedRows: rows });
  }
});
