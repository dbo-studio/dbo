import { useTabStore } from '@/store/tabStore/tab.store';
import type { StateCreator } from 'zustand';
import type { DataSelectedRowsSlice, DataStore, SelectedRow } from '../types';

const tabId = (): string | undefined => {
  return useTabStore.getState().selectedTabId;
};

export const createDataSelectedRowsSlice: StateCreator<
  DataStore & DataSelectedRowsSlice,
  [],
  [],
  DataSelectedRowsSlice
> = (set, get) => ({
  selectedRows: {},
  toggleClear: true,
  getSelectedRows: (): SelectedRow[] => {
    const id = tabId();
    if (!id) return [];

    return get().selectedRows[id] ?? [];
  },
  setSelectedRows: (rows: SelectedRow[]): void => {
    const id = tabId();
    if (!id) return;

    set((state) => ({
      selectedRows: {
        ...state.selectedRows,
        [id]: rows
      }
    }));
  },
  clearSelectedRows: (): void => {
    const id = tabId();
    if (!id) return;

    set((state) => ({
      selectedRows: {
        ...state.selectedRows,
        [id]: []
      },
      toggleClear: !state.toggleClear
    }));
  }
});
