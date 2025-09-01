import { useTabStore } from '@/store/tabStore/tab.store';
import type { StateCreator } from 'zustand';
import { useDataStore } from '../data.store';
import type { DataSelectedRowsSlice, DataStore, SelectedRow } from '../types';

export const createDataSelectedRowsSlice: StateCreator<
  DataStore & DataSelectedRowsSlice,
  [['zustand/devtools', never]],
  [],
  DataSelectedRowsSlice
> = (set) => ({
  selectedRows: [],
  updateSelectedRows: (rows: SelectedRow[], replace?: boolean): Promise<void> => {
    const selectedTabId = useTabStore.getState().selectedTabId;
    if (!selectedTabId) return Promise.resolve();

    set(
      { selectedRows: replace ? rows : [...useDataStore.getState().selectedRows, ...rows] },
      undefined,
      'updateSelectedRows'
    );
    return Promise.resolve();
  }
});
