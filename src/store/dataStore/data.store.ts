import { runQuery } from '@/src/api/query';
import { formatServerColumns } from '@/src/core/utils';
import { TabType } from '@/src/types';
import { ColumnType, RowType } from '@/src/types/Data';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useConnectionStore } from '../connectionStore/connection.store';
import { useTabStore } from '../tabStore/tab.store';
import { DataStore } from './types';

type DataState = DataStore;

export const useDataStore = create<DataState>()(
  devtools(
    (set, get) => ({
      selectedRow: {},
      rows: {},
      columns: {},
      getRows: () => {
        const selectedTab = get().selectedTab();
        const rows = get().rows;
        if (!selectedTab || !Object.prototype.hasOwnProperty.call(rows, selectedTab.id)) {
          return [];
        }
        return rows[selectedTab.id];
      },
      getColumns: () => {
        const selectedTab = get().selectedTab();
        const columns = get().columns;
        if (!selectedTab || !Object.prototype.hasOwnProperty.call(columns, selectedTab.id)) {
          return [];
        }
        return columns[selectedTab.id].filter((c: ColumnType) => c.key != 'select-row');
      },
      getSelectedRow: (): RowType | undefined => {
        const selectedTab = get().selectedTab();
        const rows = get().selectedRow;
        if (!selectedTab || !Object.prototype.hasOwnProperty.call(rows, selectedTab.id)) {
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
      updateRows: async (items: RowType[]) => {
        const selectedTab = get().selectedTab();
        if (!selectedTab) {
          return;
        }

        const rows = get().rows;
        rows[selectedTab.id] = items;

        set({ rows });
      },
      updateColumns: async (items: RowType[]) => {
        const selectedTab = get().selectedTab();
        if (!selectedTab) {
          return;
        }
        const columns = get().columns;
        columns[selectedTab.id] = formatServerColumns(items);

        set({ columns });
      },

      selectedTab: (): TabType | undefined => {
        return useTabStore.getState().selectedTab;
      },

      runQuery: async () => {
        const currentConnection = useConnectionStore.getState().currentConnection;
        const selectedTab = useTabStore.getState().selectedTab;
        if (!selectedTab || !currentConnection) {
          return;
        }

        const filters = selectedTab.filters ?? [];
        const sorts = selectedTab.sorts ?? [];

        try {
          const res = await runQuery({
            connection_id: currentConnection.id,
            table: selectedTab.table,
            schema: currentConnection.currentSchema!,
            limit: 100,
            offset: 0,
            columns: [],
            filters: filters.filter(
              (f) =>
                f.column.length > 0 &&
                f.operator.length > 0 &&
                f.value.toString().length > 0 &&
                f.next.length > 0 &&
                f.isActive
            ),
            sorts: sorts.filter((f) => f.column.length > 0 && f.operator.length > 0 && f.isActive)
          });

          useTabStore.getState().updateQuery(res.query);
          Promise.all([get().updateRows(res.data), get().updateColumns(res.structures)]);
          console.log(res);
        } catch (error) {
          console.log(error);
        }
      }
    }),
    { name: 'data' }
  )
);
