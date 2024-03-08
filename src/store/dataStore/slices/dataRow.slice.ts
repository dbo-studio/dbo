import { createEmptyRow } from '@/src/core/utils';
import { RowType } from '@/src/types';
import { StateCreator } from 'zustand';
import { useTabStore } from '../../tabStore/tab.store';
import { DataColumnSlice, DataRowSlice, DataStore } from '../types';

export const createDataRowSlice: StateCreator<DataStore & DataRowSlice & DataColumnSlice, [], [], DataRowSlice> = (
  set,
  get
) => ({
  editedRows: {},
  removedRows: {},
  unSavedRows: {},
  rows: {},
  getRows: () => {
    const selectedTab = useTabStore.getState().selectedTab;
    const rows = get().rows;
    if (!selectedTab || !Object.prototype.hasOwnProperty.call(rows, selectedTab.id)) {
      return [];
    }
    return rows[selectedTab.id];
  },
  updateRows: async (items: RowType[]) => {
    const selectedTab = useTabStore.getState().selectedTab;
    if (!selectedTab) {
      return;
    }

    const rows = get().rows;
    rows[selectedTab.id] = items;

    set({ rows });
  },
  addEmptyRow: () => {
    const rows = get().rows;
    const columns = get().getColumns();
    const unSavedRows = get().unSavedRows;
    const selectedTab = useTabStore.getState().selectedTab;
    if (!selectedTab) {
      return;
    }
    const newRow: RowType = createEmptyRow(columns);
    newRow.dbo_index = rows[selectedTab.id][rows[selectedTab.id].length - 1]!.dbo_index + 1;
    rows[selectedTab.id].push(newRow);

    if (!Object.prototype.hasOwnProperty.call(unSavedRows, selectedTab.id)) {
      unSavedRows[selectedTab.id] = [newRow];
    } else {
      unSavedRows[selectedTab.id].push(newRow);
    }

    set({ rows, unSavedRows });
  }
});
