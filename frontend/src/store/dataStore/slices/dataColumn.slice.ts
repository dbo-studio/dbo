import type { ColumnType, TabType } from '@/types';
import type { StateCreator } from 'zustand';
import type { DataColumnSlice, DataStore } from '../types';

export const createDataColumnSlice: StateCreator<DataStore & DataColumnSlice, [], [], DataColumnSlice> = (
  set,
  get
) => ({
  columns: {},
  getColumns: (tab: TabType | undefined, isActive?: boolean): ColumnType[] => {
    const columns = get().columns;
    if (!tab || !columns[tab.id]) {
      return [];
    }

    let newColumns = columns[tab.id];

    if (isActive !== undefined) {
      newColumns = newColumns.filter((c) => c.isActive);
    }

    return newColumns;
  },
  updateColumns: async (tab: TabType, items: ColumnType[]): Promise<void> => {
    const columns = get().columns;
    columns[tab.id] = items;

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
