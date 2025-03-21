import { runQuery, runRawQuery } from '@/api/query';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import type { StateCreator } from 'zustand';
import { useConnectionStore } from '../../connectionStore/connection.store';
import { useTabStore } from '../../tabStore/tab.store';
import type { DataColumnSlice, DataQuerySlice, DataRowSlice, DataStore } from '../types';

export const createDataQuerySlice: StateCreator<
  DataStore & DataQuerySlice & DataColumnSlice & DataRowSlice,
  [],
  [],
  DataQuerySlice
> = (set, get) => ({
  loading: false,
  toggleDataFetching: true,
  runQuery: async () => {
    const currentConnection = useConnectionStore.getState().currentConnection;
    const selectedTab = useTabStore.getState().getSelectedTab();
    if (!selectedTab || !currentConnection) {
      return;
    }

    const filters = selectedTab.filters ?? [];
    const sorts = selectedTab.sorts ?? [];

    try {
      set({ loading: true });
      const res = await runQuery({
        connectionId: currentConnection.id,
        nodeId: selectedTab.nodeId,
        limit: selectedTab.pagination.limit,
        offset: (selectedTab.pagination.page - 1) * selectedTab.pagination.limit,
        columns: selectedTab.columns ?? [],
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
      await Promise.all([get().updateRows(res.data), get().updateColumns(res.columns)]);
      set({ toggleDataFetching: !get().toggleDataFetching });
    } catch (error) {
      if (isAxiosError(error)) {
        toast.error(error.message);
      }
      console.log('🚀 ~ runQuery: ~ error:', error);
    } finally {
      set({ loading: false });
    }
  },
  runRawQuery: async () => {
    const currentConnection = useConnectionStore.getState().currentConnection;
    const selectedTab = useTabStore.getState().getSelectedTab();
    if (!selectedTab || !currentConnection) {
      return;
    }

    try {
      set({ loading: true });
      const res = await runRawQuery({
        connectionId: currentConnection.id,
        query: useTabStore.getState().getQuery()
      });

      useTabStore.getState().updateQuery(res.query);
      await Promise.all([get().updateRows(res.data), get().updateColumns(res.columns)]);
      set({ toggleDataFetching: !get().toggleDataFetching });
    } catch (error) {
      if (isAxiosError(error)) {
        toast.error(error.message);
      }
      console.log('🚀 ~ runRawQuery: ~ error:', error);
    } finally {
      set({ loading: false });
    }
  }
});
