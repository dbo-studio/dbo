import { pullAllBy } from 'lodash';
import type { StateCreator } from 'zustand';
import { useTabStore } from '../../tabStore/tab.store';
import type { DataSelectedRowsSlice, DataStore } from '../types';

export const createDataSelectedRowsSlice: StateCreator<
  DataStore & DataSelectedRowsSlice,
  [],
  [],
  DataSelectedRowsSlice
> = (set, get) => ({
  selectedRows: {},
  getSelectedRows: () => {
    const selectedTab = useTabStore.getState().getSelectedTab();
    const rows = get().selectedRows;
    if (!selectedTab || !Object.prototype.hasOwnProperty.call(rows, selectedTab.id)) {
      return new Set([]);
    }

    return new Set(rows[selectedTab.id]);
  },
  updateSelectedRows: (selectedRows): void => {
    const selectedTab = useTabStore.getState().getSelectedTab();
    if (!selectedTab) {
      return;
    }

    const rows = get().selectedRows;
    rows[selectedTab.id] = Array.from(selectedRows);

    set({ selectedRows: rows });
  },
  removeSelectedRows: (selectedRowsIndex: number[]): void => {
    const selectedTab = useTabStore.getState().getSelectedTab();
    if (!selectedTab) {
      return;
    }

    const rows = get().selectedRows;
    rows[selectedTab.id] = pullAllBy(rows[selectedTab.id], selectedRowsIndex);

    set({ selectedRows: rows });
  }
});
