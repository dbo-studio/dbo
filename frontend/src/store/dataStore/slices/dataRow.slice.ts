import { debouncedSaveRows } from '@/core/utils/indexdbHelper';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { RowType } from '@/types';
import type { StateCreator } from 'zustand';
import type { DataColumnSlice, DataRowSlice, DataStore, DataUnsavedRowsSlice } from '../types';

export const createDataRowSlice: StateCreator<
  DataStore & DataRowSlice & DataColumnSlice & DataUnsavedRowsSlice,
  [],
  [],
  DataRowSlice
> = (set, get) => ({
  rows: undefined,
  getRow: (row: RowType): RowType | undefined => {
    return get().rows?.find((r) => r.dbo_index === row.dbo_index);
  },
  updateRows: async (rows: RowType[]): Promise<void> => {
    const selectedTabId = useTabStore.getState().selectedTabId;
    if (!selectedTabId) return;

    set({ rows });
    debouncedSaveRows(selectedTabId, rows);

    return Promise.resolve();
  },
  updateRow: async (row: RowType): Promise<void> => {
    const rows = get().rows;
    const selectedTabId = useTabStore.getState().selectedTabId;

    if (!selectedTabId || !rows) return;

    const newRows = rows.map((r) => (r.dbo_index === row.dbo_index ? row : r));

    set({ rows: newRows });
    debouncedSaveRows(selectedTabId, newRows);

    return Promise.resolve();
  }
});
