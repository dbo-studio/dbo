import { runQuery, runRawQuery } from '@/api/query';
import type { RunQueryResponseType } from '@/api/query/types';
import { debouncedSaveToIndexedDB } from '@/core/utils/indexdbHelper';
import { extractQueryError, summarizeQueryResult } from '@/core/utils/queryResultSummary';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { DataTabType } from '@/types';
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
  lastQueryError: undefined,
  lastQueryResult: undefined,
  pendingEditorQueryRun: undefined,
  clearLastQueryError: (): void => {
    set({ lastQueryError: undefined }, undefined, 'clearLastQueryError');
  },
  clearPendingEditorQueryRun: (): void => {
    set({ pendingEditorQueryRun: undefined }, undefined, 'clearPendingEditorQueryRun');
  },
  runQueryInEditor: (query: string): void => {
    const tab = useTabStore.getState().addEditorTab(query);
    set({ pendingEditorQueryRun: { tabId: tab.id, query } }, undefined, 'runQueryInEditor');
  },
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
    const tab = useTabStore.getState().selectedTab<DataTabType>();
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
          inlineQuery: tab.inlineQuery,
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
      ]).catch((e) => {
        console.debug('🚀 ~ createDataQuerySlice ~ e:', e);
      });

      const summary = summarizeQueryResult(res);
      set({ lastQueryResult: summary, lastQueryError: undefined }, undefined, 'runQuerySuccess');
      useAiStore.getState().updateContext({
        ...useAiStore.getState().context,
        queryResultSummary: summary,
        queryError: undefined
      });

      return res;
    } catch (error) {
      if (error instanceof Error && error.name === 'CanceledError') {
        return;
      }
      const message = extractQueryError(error);
      set({ lastQueryError: message, lastQueryResult: undefined }, undefined, 'runQueryError');
      useAiStore.getState().updateContext({
        ...useAiStore.getState().context,
        queryError: message,
        queryResultSummary: undefined
      });
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
      ]).catch((e) => {
        console.debug('🚀 ~ createDataQuerySlice ~ e:', e);
      });

      const summary = summarizeQueryResult(res);
      set({ lastQueryResult: summary, lastQueryError: undefined }, undefined, 'runRawQuerySuccess');
      useAiStore.getState().updateContext({
        ...useAiStore.getState().context,
        queryResultSummary: summary,
        queryError: undefined
      });

      return res;
    } catch (error) {
      if (error instanceof Error && error.name === 'CanceledError') {
        return;
      }
      const message = extractQueryError(error);
      set({ lastQueryError: message, lastQueryResult: undefined }, undefined, 'runRawQueryError');
      useAiStore.getState().updateContext({
        ...useAiStore.getState().context,
        queryError: message,
        queryResultSummary: undefined
      });
      console.debug('🚀 ~ runRawQuery: ~ error:', error);
    } finally {
      get().toggleDataFetching(false);
    }
  }
});
