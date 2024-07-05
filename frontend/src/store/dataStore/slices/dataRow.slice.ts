import { RowType } from '@/types';
import { StateCreator } from 'zustand';
import { useTabStore } from '../../tabStore/tab.store';
import { DataColumnSlice, DataRowSlice, DataStore, DataUnsavedRowsSlice } from '../types';

export const createDataRowSlice: StateCreator<
  DataStore & DataRowSlice & DataColumnSlice & DataUnsavedRowsSlice,
  [],
  [],
  DataRowSlice
> = (set, get) => ({
  rows: {},
  getRows: (): RowType[] => {
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
  }
});
