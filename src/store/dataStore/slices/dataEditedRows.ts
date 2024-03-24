import { EditedRow } from '@/src/types';
import { StateCreator } from 'zustand';
import { useTabStore } from '../../tabStore/tab.store';
import { DataEditedRowsSlice, DataRowSlice, DataStore } from '../types';

export const createDataEditedRowsSlice: StateCreator<
  DataStore & DataEditedRowsSlice & DataRowSlice,
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
    const rows = get().editedRows;
    rows[selectedTab.id] = editedRows;
    set({ editedRows: rows });
  },
  restoreEditedRows: async (): Promise<void> => {
    const selectedTab = useTabStore.getState().selectedTab;
    if (!selectedTab) {
      return;
    }

    const newRows = get().getEditedRows();
    const oldRows = get().getRows();

    newRows.forEach((newRow: EditedRow) => {
      const findValueIndex = oldRows.findIndex((x) => x.dbo_index == newRow.dboIndex);
      oldRows[findValueIndex] = {
        ...oldRows[newRow.dboIndex],
        ...newRow.old
      };
    });

    get().updateRows(oldRows);
    get().updateEditedRows([]);
  }
});
