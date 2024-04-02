import { formatServerColumns, handelColumnChangeLog } from '@/src/core/utils';
import { ColumnType, EditedColumnType } from '@/src/types';
import { StateCreator } from 'zustand';
import { useTabStore } from '../../tabStore/tab.store';
import { DataColumnSlice, DataStore } from '../types';

export const createDataColumnSlice: StateCreator<DataStore & DataColumnSlice, [], [], DataColumnSlice> = (
  set,
  get
) => ({
  columns: {},
  editedColumns: {},
  getColumns: (withSelect: boolean) => {
    const selectedTab = useTabStore.getState().selectedTab;
    const columns = get().columns;
    if (!selectedTab || !Object.prototype.hasOwnProperty.call(columns, selectedTab.id)) {
      return [];
    }
    if (withSelect) return columns[selectedTab.id];
    return columns[selectedTab.id].filter((c: ColumnType) => c.key != 'select-row');
  },
  updateColumns: async (items: ColumnType[]) => {
    const selectedTab = useTabStore.getState().selectedTab;
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
        if (c.key == column.key) {
          return column;
        }
        return c;
      });

    get().updateColumns(columns);
  },
  getEditedColumns: () => {
    const selectedTab = useTabStore.getState().selectedTab;
    const columns = get().editedColumns;
    if (!selectedTab || !Object.prototype.hasOwnProperty.call(columns, selectedTab.id)) {
      return [];
    }
    return columns[selectedTab.id];
  },
  updateEditedColumns: async (oldValue: ColumnType, newValue: ColumnType | EditedColumnType) => {
    const selectedTab = useTabStore.getState().selectedTab;
    if (!selectedTab) {
      return;
    }
    const columns = get().editedColumns;
    columns[selectedTab.id] = handelColumnChangeLog(get().getEditedColumns(), oldValue, newValue);

    set({ editedColumns: columns });
  }
});
