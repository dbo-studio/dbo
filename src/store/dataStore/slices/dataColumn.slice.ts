import { formatServerColumns } from '@/src/core/utils';
import { ColumnType } from '@/src/types';
import { StateCreator } from 'zustand';
import { useTabStore } from '../../tabStore/tab.store';
import { DataColumnSlice, DataStore } from '../types';

export const createDataColumnSlice: StateCreator<DataStore & DataColumnSlice, [], [], DataColumnSlice> = (
  set,
  get
) => ({
  columns: {},
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
  }
});
