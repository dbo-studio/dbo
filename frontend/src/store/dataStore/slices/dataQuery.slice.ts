import { runQuery, runRawQuery } from '@/api/query';
import type { RunQueryResponseType } from '@/api/query/types';
import { debouncedSaveToIndexedDB } from '@/core/utils/indexdbHelper';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
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
  isDataFetching: false,
  toggleDataFetching: (loading?: boolean): void => {
    set({ isDataFetching: loading !== undefined ? loading : !get().isDataFetching });
  },
  runQuery: async (): Promise<RunQueryResponseType | undefined> => {
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

      Promise.all([
        get().updateRows(res.data),
        get().updateColumns(res.columns),
        debouncedSaveToIndexedDB(tab.id, res.data, res.columns)
      ]);

      return res;
    } catch (error) {
      console.log('🚀 ~ runQuery: ~ error:', error);
    } finally {
      get().toggleDataFetching(false);
    }
  },
  runRawQuery: async (query?: string): Promise<RunQueryResponseType | undefined> => {
    const selectedTabId = useTabStore.getState().selectedTabId;
    const currentConnectionId = useConnectionStore.getState().currentConnectionId;
    if (!currentConnectionId || !selectedTabId) return;

    try {
      get().toggleDataFetching(true);
      const res = await runRawQuery({
        connectionId: Number(currentConnectionId),
        query: query ? query : useTabStore.getState().getQuery()
      });

      useTabStore.getState().updateQuery(res.query);
      Promise.all([
        get().updateRows(res.data),
        get().updateColumns(res.columns),
        debouncedSaveToIndexedDB(selectedTabId, res.data, res.columns)
      ]);

      return res;
    } catch (error) {
      console.log('🚀 ~ runRawQuery: ~ error:', error);
    } finally {
      get().toggleDataFetching(false);
    }
  }
});
