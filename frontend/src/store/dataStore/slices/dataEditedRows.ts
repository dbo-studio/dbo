import { EditedRow, RowType } from '@/types';
import { pullAt } from 'lodash';
import { StateCreator } from 'zustand';
import { useTabStore } from '../../tabStore/tab.store';
import { DataEditedRowsSlice, DataRowSlice, DataStore, DataUnsavedRowsSlice } from '../types';

export const createDataEditedRowsSlice: StateCreator<
  DataStore & DataEditedRowsSlice & DataRowSlice & DataUnsavedRowsSlice,
  [],
  [],
  DataEditedRowsSlice
> = (set, get) => ({
  editedRows: {},
  getEditedRows: (): EditedRow[] => {
    const selectedTab = useTabStore.getState().selectedTab;
    const rows = get().editedRows;
    if (!selectedTab || !Object.prototype.hasOwnProperty.call(rows, selectedTab.id)) {
      return [];
    }
    return rows[selectedTab.id];
  },
  updateEditedRows: (editedRows: EditedRow[]): void => {
    const selectedTab = useTabStore.getState().selectedTab;
    if (!selectedTab) {
      return;
    }

    const unSavedRows = get().getUnsavedRows();
    const shouldBeUnsaved: RowType[] = [];

    editedRows.forEach((editedRow: EditedRow, index: number) => {
      const findValueIndex = unSavedRows.findIndex((x) => x.dbo_index == editedRow.dboIndex);
      if (findValueIndex > -1) {
        shouldBeUnsaved.push(...pullAt(editedRows, [index]));
      }
    });

    //  if row exists in unsaved'rows, it should not push into edited'rows list
    shouldBeUnsaved.forEach((unSavedRow) => {
      const { dboIndex, ...data } = unSavedRow;
      const newUnsavedRow = {
        ...data.new,
        dbo_index: dboIndex
      };
      get().addUnsavedRows(newUnsavedRow);
    });

    const rows = get().editedRows;
    rows[selectedTab.id] = editedRows;
    set({ editedRows: rows });
  },
  restoreEditedRows: async (): Promise<void> => {
    const newRows = get().getEditedRows();
    const oldRows = get().getRows();

    newRows.forEach((newRow: EditedRow) => {
      const findValueIndex = oldRows.findIndex((x) => x.dbo_index == newRow.dboIndex);
      oldRows[findValueIndex] = {
        ...oldRows[findValueIndex],
        ...newRow.old
      };
    });

    get().updateRows(oldRows);
    get().updateEditedRows([]);
  },
  removeEditedRowsByTabId: (tabId: string) => {
    const rows = get().editedRows;
    if (Object.prototype.hasOwnProperty.call(rows, tabId)) {
      delete rows[tabId];
    }

    set({ editedRows: rows });
  }
});
