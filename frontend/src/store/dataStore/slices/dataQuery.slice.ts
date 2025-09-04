import { runQuery, runRawQuery } from '@/api/query';
import type { RunQueryResponseType } from '@/api/query/types';
import { debouncedSaveToIndexedDB } from '@/core/utils/indexdbHelper';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import type { StateCreator } from 'zustand';
import { useTabStore } from '../../tabStore/tab.store';
import type { DataColumnSlice, DataQuerySlice, DataRowSlice, DataStore } from '../types';

export const createDataQuerySlice: StateCreator<
  DataStore & DataQuerySlice & DataColumnSlice & DataRowSlice,
  [['zustand/devtools', never]],
  [],
  DataQuerySlice
> = (set, get) => ({
  isDataFetching: false,
  reRunQuery: false,
  reRender: false,
  toggleReRunQuery(): void {
    set({ reRunQuery: !get().reRunQuery }, undefined, 'toggleReRunQuery');
  },
  toggleReRender(): void {
    set({ reRender: !get().reRender }, undefined, 'toggleReRender');
  },
  toggleDataFetching: (loading?: boolean): void => {
    set({ isDataFetching: loading ?? !get().isDataFetching }, undefined, 'toggleDataFetching');
  },
  runQuery: async (abortController?: AbortController): Promise<RunQueryResponseType | undefined> => {
    const tab = useTabStore.getState().selectedTab();
    if (!tab) return;

    const filters = tab.filters ?? [];
    const sorts = tab.sorts ?? [];

    try {
      get().toggleDataFetching(true);
      const res = await runQuery(
        {
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
        },
        abortController?.signal
      );

      if (abortController?.signal.aborted) {
        return;
      }

      useTabStore.getState().updateQuery(res.query);

      Promise.all([
        get().updateRows(res.data),
        get().updateColumns(res.columns),
        debouncedSaveToIndexedDB(tab.id, res.data, res.columns)
      ]);

      return res;
    } catch (error) {
      if (error instanceof Error && error.name === 'CanceledError') {
        return;
      }
      console.debug('🚀 ~ runQuery: ~ error:', error);
    } finally {
      get().toggleDataFetching(false);
    }
  },
  runRawQuery: async (query?: string, abortController?: AbortController): Promise<RunQueryResponseType | undefined> => {
    const selectedTabId = useTabStore.getState().selectedTabId;
    const currentConnectionId = useConnectionStore.getState().currentConnectionId;
    if (!currentConnectionId || !selectedTabId) return;

    try {
      get().toggleDataFetching(true);
      const res = await runRawQuery(
        {
          connectionId: Number(currentConnectionId),
          query: query ? query : useTabStore.getState().getQuery()
        },
        abortController?.signal
      );

      if (abortController?.signal.aborted) {
        return;
      }

      useTabStore.getState().updateQuery(res.query);
      Promise.all([
        get().updateRows(res.data),
        get().updateColumns(res.columns),
        debouncedSaveToIndexedDB(selectedTabId, res.data, res.columns)
      ]);

      return res;
    } catch (error) {
      if (error instanceof Error && error.name === 'CanceledError') {
        return;
      }
      console.debug('🚀 ~ runRawQuery: ~ error:', error);
    } finally {
      get().toggleDataFetching(false);
    }
  }
});
