import type { RowType, TabType } from '@/types';
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
    const tab = useTabStore.getState().selectedTab();
    if (!tab) return [];

    const rows = get().removedRows;
    return rows[tab?.id as string] ?? [];
  },
  updateRemovedRows: (): void => {
    const tab = useTabStore.getState().selectedTab();
    if (!tab) return;

    const rowsIndex = Array.from(get().getSelectedRows().values()).map((row) => row.index);
    const rows = get()
      .getRows()
      .filter((r: RowType) => rowsIndex.includes(r.dbo_index));

    //unsaved items will remove immediately if selected and should not store in removed rows list
    const unsavedRows = get()
      .getUnsavedRows()
      .filter((r) => rowsIndex.includes(r.dbo_index));
    const unsavedRowsId = unsavedRows.map((r) => r.dbo_index);

    const removedRows = get().removedRows;
    removedRows[tab.id] = rows
      .map((row) => {
        // for deleting a row from db we referenced to row's id and if it doesn't exists to all fields
        if (row.id) {
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
    get().clearSelectedRows();
  },
  deleteRemovedRowsByTabId: (tabId: string): void => {
    const rows = get().removedRows;
    if (rows[tabId]) {
      delete rows[tabId];
    }

    set({ removedRows: rows });
  }
});
