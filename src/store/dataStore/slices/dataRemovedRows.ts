import { RowType } from '@/src/types';
import { StateCreator } from 'zustand';
import { useTabStore } from '../../tabStore/tab.store';
import { DataRemovedRowsSlice, DataRowSlice, DataStore } from '../types';

export const createDataRemovedRowsSlice: StateCreator<
  DataStore & DataRemovedRowsSlice & DataRowSlice,
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
  updateRemovedRows: (rows: RowType[]) => {
    const selectedTab = useTabStore.getState().selectedTab;
    if (!selectedTab) {
      return;
    }
    const selectedRows = get()
      .getRows()
      .filter((r: RowType) => rows.includes(r.dbo_index));

    const removedRows = get().removedRows;

    removedRows[selectedTab.id] = selectedRows.map(function (row) {
      if (Object.prototype.hasOwnProperty.call(row, 'id')) {
        return {
          id: row.id,
          dbo_index: row.dbo_index
        };
      }

      return row;
    });

    set({ removedRows });
  },
  applyRemovedRows: (): void => {
    const removedRows = get().getRemovedRows();
    const rows = get()
      .getRows()
      .filter((row) => {
        return !removedRows.some((v) => v.dbo_index == row.dbo_index);
      });

    get().updateRows(rows);
  }
});
