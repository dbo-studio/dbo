import { StateCreator } from 'zustand';
import { useTabStore } from '../../tabStore/tab.store';
import { DataSelectedRowsSlice, DataStore } from '../types';

export const createDataSelectedRowsSlice: StateCreator<
  DataStore & DataSelectedRowsSlice,
  [],
  [],
  DataSelectedRowsSlice
> = (set, get) => ({
  selectedRows: {},
  getSelectedRows: () => {
    const selectedTab = useTabStore.getState().selectedTab;
    const rows = get().selectedRows;
    if (!selectedTab || !Object.prototype.hasOwnProperty.call(rows, selectedTab.id)) {
      return new Set([]);
    }

    return new Set(rows[selectedTab.id]);
  },
  updateSelectedRows: (selectedRows) => {
    const selectedTab = useTabStore.getState().selectedTab;
    if (!selectedTab) {
      return;
    }

    const rows = get().selectedRows;
    rows[selectedTab.id] = Array.from(selectedRows);

    set({ selectedRows: rows });
  }
});
