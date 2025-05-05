import { useTabStore } from '@/store/tabStore/tab.store';
import type { ColumnType } from '@/types';
import type { StateCreator } from 'zustand';
import type { DataColumnSlice, DataStore } from '../types';

const tabId = (): string => {
  return useTabStore.getState().selectedTabId ?? '';
};

export const createDataColumnSlice: StateCreator<DataStore & DataColumnSlice, [], [], DataColumnSlice> = (
  set,
  get
) => ({
  columns: {},
  getColumns: (isActive?: boolean): ColumnType[] => {
    const selectedTabId = tabId();
    const columns = get().columns;

    if (!selectedTabId || !columns[selectedTabId]) {
      return [];
    }

    let newColumns = columns[selectedTabId];

    if (isActive !== undefined) {
      newColumns = newColumns.filter((c) => c.isActive);
    }

    return newColumns;
  },
  updateColumns: async (items: ColumnType[]): Promise<void> => {
    const selectedTabId = tabId();
    if (!selectedTabId) return;

    set((state) => ({
      columns: {
        ...state.columns,
        [selectedTabId]: items
      }
    }));
  },
  removeColumnsByTabId: (tabId: string): void => {
    set((state) => ({
      columns: Object.fromEntries(Object.entries(state.columns).filter(([key]) => key !== tabId))
    }));
  }
});
