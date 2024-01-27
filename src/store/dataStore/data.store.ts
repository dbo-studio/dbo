import { TabType } from '@/src/types';
import { ColumnType, RowType } from '@/src/types/Data';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useTabStore } from '../tabStore/tab.store';
import { DataStore } from './types';

type DataState = DataStore;

export const useDataStore = create<DataState>()(
  devtools((set, get) => ({
    selectedRow: {},
    rows: {},
    columns: {},
    getRows: () => {
      const selectedTab = get().selectedTab();
      const rows = get().rows;
      if (!selectedTab || !rows.hasOwnProperty(selectedTab.id)) {
        return [];
      }
      return rows[selectedTab.id];
    },
    getColumns: () => {
      const selectedTab = get().selectedTab();
      const columns = get().columns;
      if (!selectedTab || !columns.hasOwnProperty(selectedTab.id)) {
        return [];
      }
      return columns[selectedTab.id].filter((c: ColumnType) => c.key != 'select-row');
    },
    getSelectedRow: (): RowType | undefined => {
      const selectedTab = get().selectedTab();
      const rows = get().selectedRow;
      if (!selectedTab || !rows.hasOwnProperty(selectedTab.id)) {
        return undefined;
      }
      return rows[selectedTab.id];
    },
    updateSelectedRow: (selectedRow: RowType | undefined) => {
      const selectedTab = get().selectedTab();
      if (!selectedTab) {
        return;
      }

      const rows = get().selectedRow;
      rows[selectedTab.id] = selectedRow;

      set({ selectedRow: rows });
    },
    updateRows: (items: RowType[]) => {
      const selectedTab = get().selectedTab();
      if (!selectedTab) {
        return;
      }

      const rows = get().rows;
      rows[selectedTab.id] = items;

      set({ rows });
    },
    updateColumns: (items: RowType[]) => {
      const selectedTab = get().selectedTab();
      if (!selectedTab) {
        return;
      }
      const columns = get().columns;
      columns[selectedTab.id] = items;

      set({ columns });
    },

    selectedTab: (): TabType | undefined => {
      return useTabStore.getState().selectedTab;
    }
  }))
);
