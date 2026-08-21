import { runQuery, runRawQuery } from '@/api/query';
import type { GridMetaType, RunQueryResponseType } from '@/api/query/types';
import { filterOperatorRequiresValue } from '@/core/constants';
import { indexedDBService } from '@/core/indexedDB/indexedDB.service';
import { resolveSafeModeGate } from '@/core/utils/safeModeGate';
import { debouncedSaveToIndexedDB } from '@/core/utils/indexdbHelper';
import { summarizeQueryResult } from '@/core/utils/queryResultSummary';
import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { getEditorSessionContext } from '@/hooks/useEditorSessionContext';
import { DataTabType, EditorTabType } from '@/types';
import type { StateCreator } from 'zustand';
import { toast } from 'sonner';
import { useTabStore } from '../../tabStore/tab.store';
import type {
  DataColumnSlice,
  DataEditedRowsSlice,
  DataQuerySlice,
  DataRemovedRowsSlice,
  DataRowSlice,
  DataSelectedRowsSlice,
  DataStore,
  DataUnsavedRowsSlice
} from '../types';

const isCanceledError = (error: unknown): boolean =>
  error instanceof Error && (error.name === 'CanceledError' || error.name === 'AbortError');

export const createDataQuerySlice: StateCreator<
  DataStore &
    DataQuerySlice &
    DataColumnSlice &
    DataRowSlice &
    DataEditedRowsSlice &
    DataRemovedRowsSlice &
    DataUnsavedRowsSlice &
    DataSelectedRowsSlice,
  [['zustand/devtools', never]],
  [],
  DataQuerySlice
> = (set, get) => {
  let queryAbortController: AbortController | undefined;

  const attachAbortController = (abortController?: AbortController): AbortController => {
    queryAbortController?.abort();
    const controller = abortController ?? new AbortController();
    queryAbortController = controller;
    return controller;
  };

  const clearAbortController = (controller: AbortController): void => {
    if (queryAbortController === controller) {
      queryAbortController = undefined;
    }
  };

  return {
    isDataFetching: false,
    reRunQuery: false,
    reRender: false,
    lastQueryResult: undefined,
    pendingEditorQueryRun: undefined,
    gridEditable: false,
    updatableNodeId: undefined,
    editableReason: undefined,
    drivingTable: undefined,
    queryPaginated: false,
    clearPendingEditorQueryRun: (): void => {
      set({ pendingEditorQueryRun: undefined }, undefined, 'clearPendingEditorQueryRun');
    },
    cancelRunningQuery: (options?: { silent?: boolean }): void => {
      if (!queryAbortController) {
        return;
      }
      queryAbortController.abort();
      queryAbortController = undefined;
      set({ isDataFetching: false }, undefined, 'cancelRunningQuery');
      if (!options?.silent) {
        toast.info(locales.query_cancelled);
      }
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
    updateGridMeta: async (meta: GridMetaType): Promise<void> => {
      const selectedTabId = useTabStore.getState().selectedTabId;
      set(
        {
          gridEditable: meta.gridEditable,
          updatableNodeId: meta.updatableNodeId,
          editableReason: meta.editableReason,
          drivingTable: meta.drivingTable
        },
        undefined,
        'updateGridMeta'
      );

      if (selectedTabId) {
        await indexedDBService.saveGridMeta(selectedTabId, meta);
      }
    },
    clearGridChanges: async (): Promise<void> => {
      await Promise.all([get().updateEditedRows([]), get().updateRemovedRows([]), get().updateUnsavedRows([])]);
      get().updateSelectedRows([], true);
    },
    runQuery: async (abortController?: AbortController): Promise<RunQueryResponseType | undefined> => {
      const tab = useTabStore.getState().selectedTab<DataTabType>();
      if (!tab) return;

      const filters = tab.filters ?? [];
      const sorts = tab.sorts ?? [];
      const controller = attachAbortController(abortController);

      try {
        get().toggleDataFetching(true);
        await get().clearGridChanges();
        await get().updateGridMeta({
          gridEditable: tab.editable,
          updatableNodeId: tab.nodeId
        });

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
                f.next.length > 0 &&
                f.isActive &&
                (filterOperatorRequiresValue(f.operator) ? f.value.toString().length > 0 : true)
            ),
            sorts: sorts.filter((f) => f.column.length > 0 && f.operator.length > 0 && f.isActive)
          },
          controller.signal
        );

        if (controller.signal.aborted) {
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
        set(
          {
            lastQueryResult: summary,
            queryPaginated: false
          },
          undefined,
          'runQuerySuccess'
        );
        useAiStore.getState().updateContext({
          ...useAiStore.getState().context,
          queryResultSummary: summary
        });

        return res;
      } catch (error) {
        if (isCanceledError(error)) {
          return;
        }
        console.debug('🚀 ~ runQuery: ~ error:', error);
      } finally {
        clearAbortController(controller);
        get().toggleDataFetching(false);
      }
    },
    runRawQuery: async (
      query?: string,
      abortController?: AbortController
    ): Promise<RunQueryResponseType | undefined> => {
      const selectedTabId = useTabStore.getState().selectedTabId;
      const selectedTab = useTabStore.getState().selectedTab<EditorTabType>();
      const currentConnectionId = useConnectionStore.getState().currentConnectionId;
      if (!currentConnectionId || !selectedTabId) return;

      const requestQuery = query ? query : useTabStore.getState().getQuery();
      const controller = attachAbortController(abortController);

      const execute = async (confirmed: boolean): Promise<RunQueryResponseType> => {
        const session = getEditorSessionContext();
        return runRawQuery(
          {
            connectionId: Number(currentConnectionId),
            query: requestQuery,
            database: session.database,
            schema: session.schema,
            confirmed,
            limit: selectedTab?.pagination?.limit ?? 100,
            page: selectedTab?.pagination?.page ?? 1
          },
          controller.signal
        );
      };

      try {
        get().toggleDataFetching(true);
        await get().clearGridChanges();

        let res: RunQueryResponseType;
        try {
          res = await execute(false);
        } catch (error) {
          if (isCanceledError(error) || controller.signal.aborted) {
            return;
          }
          const shouldRetry = await resolveSafeModeGate(error);
          if (!shouldRetry) {
            return;
          }
          res = await execute(true);
        }

        if (controller.signal.aborted) {
          return;
        }

        if (res.query) {
          useTabStore.getState().updateQuery(res.query);
        }

        const gridMeta: GridMetaType = {
          gridEditable: !!res.editable,
          updatableNodeId: res.nodeId,
          editableReason: res.editableReason,
          drivingTable: res.drivingTable
        };

        await get().updateGridMeta(gridMeta);

        await Promise.all([
          get().updateRows(res.data),
          get().updateColumns(res.columns),
          indexedDBService.saveRows(selectedTabId, res.data),
          indexedDBService.saveColumns(selectedTabId, res.columns, gridMeta)
        ]);

        const summary = summarizeQueryResult(res);
        set(
          {
            lastQueryResult: summary,
            queryPaginated: !!res.paginated
          },
          undefined,
          'runRawQuerySuccess'
        );
        useAiStore.getState().updateContext({
          ...useAiStore.getState().context,
          queryResultSummary: summary
        });

        if (selectedTab) {
          useSettingStore.getState().setEditorContextForConnection(currentConnectionId, {
            database: selectedTab.database ?? '',
            schema: selectedTab.schema ?? ''
          });
        }

        return res;
      } catch (error) {
        if (isCanceledError(error)) {
          return;
        }
        console.debug('🚀 ~ runRawQuery: ~ error:', error);
      } finally {
        clearAbortController(controller);
        get().toggleDataFetching(false);
      }
    }
  };
};
