import { useTabStore } from '@/store/tabStore/tab.store';
import type { RowType } from '@/types';
import type { StateCreator } from 'zustand';
import type { DataColumnSlice, DataRowSlice, DataStore, DataUnsavedRowsSlice } from '../types';

const tabId = (): string | undefined => {
  return useTabStore.getState().selectedTabId;
};

export const createDataRowSlice: StateCreator<
  DataStore & DataRowSlice & DataColumnSlice & DataUnsavedRowsSlice,
  [],
  [],
  DataRowSlice
> = (set, get) => ({
  rows: {},
  getRows: (): RowType[] => {
    const id = tabId();
    if (!id) {
      return [];
    }

    return get().rows[id] ?? [];
  },
  getRow: (dboIndex: number): RowType => {
    return get()
      .getRows()
      .find((r) => r.dbo_index === dboIndex);
  },
  updateRows: async (items: RowType[]): Promise<void> => {
    const id = tabId();
    if (!id) return;

    set((state) => ({
      rows: {
        ...state.rows,
        [id]: items
      }
    }));
  },
  updateRow: (item: RowType): void => {
    const id = tabId();
    if (!id) return;

    const rows = get().rows;
    rows[id] = get()
      .getRows()
      .map((r) => {
        if (r.dbo_index === item.dbo_index) return item;
        return r;
      });

    set({ rows });
  },
  removeRowsByTabId: (tabId: string): void => {
    set((state) => ({
      rows: Object.fromEntries(Object.entries(state.rows).filter(([key]) => key !== tabId))
    }));
  }
});
