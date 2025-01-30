import type { RowType } from '@/types';
import type { StateCreator } from 'zustand';
import { useTabStore } from '../../tabStore/tab.store';
import type { DataColumnSlice, DataRowSlice, DataStore, DataUnsavedRowsSlice } from '../types';

export const createDataRowSlice: StateCreator<
  DataStore & DataRowSlice & DataColumnSlice & DataUnsavedRowsSlice,
  [],
  [],
  DataRowSlice
> = (set, get) => ({
  rows: {},
  getRows: (): RowType[] => {
    const selectedTab = useTabStore.getState().getSelectedTab();
    const rows = get().rows;
    if (!selectedTab || !rows[selectedTab.id]) {
      return [];
    }
    return rows[selectedTab.id];
  },
  getRow: (dboIndex: number): RowType => {
    return get()
      .getRows()
      .find((r) => r.dbo_index === dboIndex);
  },
  updateRows: async (items: RowType[]) => {
    const selectedTab = useTabStore.getState().getSelectedTab();
    if (!selectedTab) {
      return;
    }

    const rows = get().rows;
    rows[selectedTab.id] = items;

    set({ rows });
  },
  updateRow: (item: RowType) => {
    const selectedTab = useTabStore.getState().getSelectedTab();
    if (!selectedTab) return;

    const rows = get().rows;
    rows[selectedTab.id] = get()
      .getRows()
      .map((r) => {
        if (r.dbo_index === item.dbo_index) return item;
        return r;
      });

    set({ rows });
  },
  removeRowsByTabId: (tabId: string) => {
    const rows = get().rows;
    if (rows[tabId]) {
      delete rows[tabId];
    }

    set({ rows: rows });
  }
});
