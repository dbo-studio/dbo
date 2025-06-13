import { useTabStore } from '@/store/tabStore/tab.store';
import type { StateCreator } from 'zustand';
import type { DataSelectedRowsSlice, DataStore, SelectedRow } from '../types';

export const createDataSelectedRowsSlice: StateCreator<
  DataStore & DataSelectedRowsSlice,
  [],
  [],
  DataSelectedRowsSlice
> = (set) => ({
  selectedRows: [],
  updateSelectedRows: (rows: SelectedRow[]): Promise<void> => {
    const selectedTabId = useTabStore.getState().selectedTabId;
    if (!selectedTabId) return Promise.resolve();

    set({ selectedRows: rows });
    return Promise.resolve();
  }
});
