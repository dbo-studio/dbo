import { formatServerColumns } from '@/core/utils';
import type { ColumnType } from '@/types';
import type { StateCreator } from 'zustand';
import { useTabStore } from '../../tabStore/tab.store';
import type { DataColumnSlice, DataStore } from '../types';

export const createDataColumnSlice: StateCreator<DataStore & DataColumnSlice, [], [], DataColumnSlice> = (
  set,
  get
) => ({
  columns: {},
  editedColumns: {},
  getColumns: (withSelect: boolean, isActive?: boolean) => {
    const selectedTab = useTabStore.getState().getSelectedTab();
    const columns = get().columns;
    if (!selectedTab || !columns[selectedTab.id]) {
      return [];
    }

    let newColumns = columns[selectedTab.id];

    if (isActive) {
      newColumns = newColumns.filter((c) => c.isActive);
    }

    if (withSelect) return newColumns;
    return newColumns.filter((c: ColumnType) => c.key !== 'select-row');
  },
  updateColumns: async (items: ColumnType[]) => {
    const selectedTab = useTabStore.getState().getSelectedTab();
    if (!selectedTab) {
      return;
    }
    const columns = get().columns;
    columns[selectedTab.id] = formatServerColumns(items);

    set({ columns });
  },
  updateColumn: async (column: ColumnType) => {
    const columns = get()
      .getColumns()
      .map((c) => {
        if (c.key === column.key) {
          return column;
        }
        return c;
      });

    get().updateColumns(columns);
  },
  removeColumnsByTabId: (tabId: string) => {
    const columns = get().columns;
    if (!columns[tabId]) {
      delete columns[tabId];
    }

    set({ columns: columns });
  }
});
