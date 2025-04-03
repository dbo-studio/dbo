import type { RowType, TabType } from '@/types';
import type { StateCreator } from 'zustand';
import type { DataColumnSlice, DataRowSlice, DataStore, DataUnsavedRowsSlice } from '../types';

export const createDataRowSlice: StateCreator<
  DataStore & DataRowSlice & DataColumnSlice & DataUnsavedRowsSlice,
  [],
  [],
  DataRowSlice
> = (set, get) => ({
  rows: {},
  getRows: (tab: TabType | undefined): RowType[] => {
    const rows = get().rows;
    if (!tab || !rows[tab.id]) {
      return [];
    }
    return rows[tab.id];
  },
  getRow: (tab: TabType, dboIndex: number): RowType => {
    return get()
      .getRows(tab)
      .find((r) => r.dbo_index === dboIndex);
  },
  updateRows: async (tab: TabType, items: RowType[]): Promise<void> => {
    const rows = get().rows;
    rows[tab.id] = items;

    set({ rows });
  },
  updateRow: (tab: TabType, item: RowType): void => {
    const rows = get().rows;
    rows[tab.id] = get()
      .getRows(tab)
      .map((r) => {
        if (r.dbo_index === item.dbo_index) return item;
        return r;
      });

    set({ rows });
  },
  removeRowsByTabId: (tabId: string): void => {
    const rows = get().rows;
    if (rows[tabId]) {
      delete rows[tabId];
    }

    set({ rows: rows });
  }
});
