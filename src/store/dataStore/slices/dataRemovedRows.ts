import { RowType } from '@/src/types';
import { StateCreator } from 'zustand';
import { useTabStore } from '../../tabStore/tab.store';
import { DataRemovedRowsSlice, DataRowSlice, DataSelectedRowsSlice, DataStore, DataUnsavedRowsSlice } from '../types';

export const createDataRemovedRowsSlice: StateCreator<
  DataStore & DataRemovedRowsSlice & DataRowSlice & DataUnsavedRowsSlice & DataSelectedRowsSlice,
  [],
  [],
  DataRemovedRowsSlice
> = (set, get) => ({
  removedRows: {},
  getRemovedRows: (): RowType[] => {
    const selectedTab = useTabStore.getState().selectedTab;
    const rows = get().removedRows;
    if (!selectedTab || !Object.prototype.hasOwnProperty.call(rows, selectedTab.id)) {
      return [];
    }
    return rows[selectedTab.id];
  },
  updateRemovedRows: (rowsIndex: number[]) => {
    const selectedTab = useTabStore.getState().selectedTab;
    if (!selectedTab) {
      return;
    }

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
      .map(function (row) {
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
    get().removeSelectedRows(unsavedRowsId);
  }
});
