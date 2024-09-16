import type { RowType } from '@/types';
import type { StateCreator } from 'zustand';
import { useTabStore } from '../../tabStore/tab.store';
import type {
  DataRemovedRowsSlice,
  DataRowSlice,
  DataSelectedRowsSlice,
  DataStore,
  DataUnsavedRowsSlice
} from '../types';

export const createDataRemovedRowsSlice: StateCreator<
  DataStore & DataRemovedRowsSlice & DataRowSlice & DataUnsavedRowsSlice & DataSelectedRowsSlice,
  [],
  [],
  DataRemovedRowsSlice
> = (set, get) => ({
  removedRows: {},
  getRemovedRows: (): RowType[] => {
    const selectedTab = useTabStore.getState().getSelectedTab();
    const rows = get().removedRows;
    if (!selectedTab || !Object.prototype.hasOwnProperty.call(rows, selectedTab.id)) {
      return [];
    }
    return rows[selectedTab.id];
  },
  updateRemovedRows: () => {
    const selectedTab = useTabStore.getState().getSelectedTab();
    if (!selectedTab) {
      return;
    }

    const rowsIndex = Array.from(get().getSelectedRows());
    const rows = get()
      .getRows()
      .filter((r: RowType) => rowsIndex.includes(r.dbo_index));

    //unsaved items will remove immediately if selected and should not store in removed rows list
    const unsavedRows = get()
      .getUnsavedRows()
      .filter((r) => rowsIndex.includes(r.dbo_index));
    const unsavedRowsId = unsavedRows.map((r) => r.dbo_index);

    const removedRows = get().removedRows;
    removedRows[selectedTab.id] = rows
      .map((row) => {
        // for deleting a row from db we referenced to row's id and if it doesn't exists to all fields
        if (Object.prototype.hasOwnProperty.call(row, 'id')) {
          return {
            id: row.id,
            dbo_index: row.dbo_index
          };
        }

        return row;
      })
      .filter((r) => !unsavedRowsId.includes(r.dbo_index));

    set({ removedRows });
    get().discardUnsavedRows(unsavedRows);
    get().updateSelectedRows([]);
  },
  deleteRemovedRowsByTabId: (tabId: string) => {
    const rows = get().removedRows;
    if (Object.prototype.hasOwnProperty.call(rows, tabId)) {
      delete rows[tabId];
    }

    set({ removedRows: rows });
  }
});
