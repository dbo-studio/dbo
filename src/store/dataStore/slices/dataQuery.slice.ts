import { runQuery, runRawQuery } from '@/src/api/query';
import { StateCreator } from 'zustand';
import { useConnectionStore } from '../../connectionStore/connection.store';
import { useTabStore } from '../../tabStore/tab.store';
import { DataColumnSlice, DataQuerySlice, DataRowSlice, DataStore } from '../types';

export const createDataQuerySlice: StateCreator<
  DataStore & DataQuerySlice & DataColumnSlice & DataRowSlice,
  [],
  [],
  DataQuerySlice
> = (set, get) => ({
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
    } catch (error) {
      console.log('🚀 ~ runQuery: ~ error:', error);
    }
  },
  runRawQuery: async () => {
    const currentConnection = useConnectionStore.getState().currentConnection;
    const selectedTab = useTabStore.getState().selectedTab;
    if (!selectedTab || !currentConnection) {
      return;
    }

    try {
      const res = await runRawQuery({
        connection_id: currentConnection.id,
        query: selectedTab.query
      });

      useTabStore.getState().updateQuery(res.query);
      Promise.all([get().updateRows(res.data), get().updateColumns(res.structures)]);
    } catch (error) {
      console.log('🚀 ~ runQuery: ~ error:', error);
    }
  }
});
