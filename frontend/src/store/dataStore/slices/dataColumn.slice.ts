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

    const columns = get().columns;
    columns[selectedTabId] = items;

    set({ columns });
  },
  removeColumnsByTabId: (tabId: string): void => {
    const columns = get().columns;
    if (columns[tabId]) {
      delete columns[tabId];
    }

    set({ columns: columns });
  }
});
