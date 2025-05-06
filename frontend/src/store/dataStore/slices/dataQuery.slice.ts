import { runQuery, runRawQuery } from '@/api/query';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import type { StateCreator } from 'zustand';
import { useTabStore } from '../../tabStore/tab.store';
import type { DataColumnSlice, DataQuerySlice, DataRowSlice, DataStore } from '../types';

export const createDataQuerySlice: StateCreator<
  DataStore & DataQuerySlice & DataColumnSlice & DataRowSlice,
  [],
  [],
  DataQuerySlice
> = (set, get) => ({
  loading: false,
  isDataFetching: true,
  toggleDataFetching: (loading?: boolean): void => {
    set({ isDataFetching: loading !== undefined ? loading : !get().isDataFetching });
  },
  runQuery: async (): Promise<void> => {
    const tab = useTabStore.getState().selectedTab();
    if (!tab) return;

    const filters = tab.filters ?? [];
    const sorts = tab.sorts ?? [];

    try {
      get().toggleDataFetching(true);
      const res = await runQuery({
        connectionId: Number(tab.connectionId),
        nodeId: tab.nodeId,
        limit: tab.pagination?.limit ?? 100,
        page: tab.pagination?.page ?? 1,
        columns: tab.columns ?? [],
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
    } catch (error) {
      console.log('🚀 ~ runQuery: ~ error:', error);
    } finally {
      console.log('asdasd');
      get().toggleDataFetching(false);
    }
  },
  runRawQuery: async (query?: string): Promise<void> => {
    const currentConnectionId = useConnectionStore.getState().currentConnectionId;
    if (!currentConnectionId) return;

    try {
      get().toggleDataFetching(true);
      const res = await runRawQuery({
        connectionId: Number(currentConnectionId),
        query: query ? query : useTabStore.getState().getQuery()
      });

      useTabStore.getState().updateQuery(res.query);

      await Promise.all([get().updateRows(res.data), get().updateColumns(res.columns)]);
      set({ isDataFetching: !get().isDataFetching });
    } catch (error) {
      if (isAxiosError(error)) {
        toast.error(error.message);
      }
      console.log('🚀 ~ runRawQuery: ~ error:', error);
    } finally {
      get().toggleDataFetching(false);
    }
  }
});
