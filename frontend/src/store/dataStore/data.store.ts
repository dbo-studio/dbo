import { indexedDBService } from '@/core/indexedDB/indexedDB.service';
import type { ColumnType, RowType } from '@/types';
import { usePane } from '@/hooks/usePane';
import type { PaneId } from '@/store/tabStore/tabs';
import { create, useStore, type StoreApi } from 'zustand';
import { devtools } from 'zustand/middleware';
import { selectPaneSelectedTabId, useTabStore } from '@/store/tabStore/tab.store';
import { createDataColumnSlice } from './slices/dataColumn.slice';
import { createDataEditedRowsSlice } from './slices/dataEditedRows.slice';
import { createDataFormDataSlice } from './slices/dataFormData.slice';
import { createDataQuerySlice } from './slices/dataQuery.slice';
import { createDataRemovedRowsSlice } from './slices/dataRemovedRows.slice';
import { createDataRowSlice } from './slices/dataRow.slice';
import { createDataSelectedRowsSlice } from './slices/dataSelectedRows.slice';
import { createDataUnsavedRowsSlice } from './slices/dataUnsavedRows.slice';
import type { DataState } from './types';

export type { DataState };

const createDataStore = (paneId: PaneId): StoreApi<DataState> =>
  create<DataState>()(
    devtools(
      (set, get, ...state) => ({
        paneId,
        loadDataFromIndexedDB: async (): Promise<{
          rows: RowType[];
          columns: ColumnType[];
        } | null> => {
          const selectedTabId = selectPaneSelectedTabId(get().paneId);
          if (!selectedTabId) return null;

          get().toggleDataFetching(true);

          set(
            {
              gridEditable: false,
              updatableNodeId: undefined,
              editableReason: undefined,
              drivingTable: undefined
            },
            undefined,
            'clearGridMetaBeforeLoad'
          );

          await Promise.all([
            get().updateRows([]),
            get().updateColumns([]),
            get().updateEditedRows([]),
            get().updateRemovedRows([]),
            get().updateUnsavedRows([])
          ]);
          get().updateSelectedRows([], true);

          try {
            const [dbRows, dbColumns, dbEditedRows, dbRemovedRows, dbUnsavedRows, dbSelectedRows, dbGridMeta] =
              await Promise.all([
                indexedDBService.getRows(selectedTabId),
                indexedDBService.getColumns(selectedTabId),
                indexedDBService.getEditedRows(selectedTabId),
                indexedDBService.getRemovedRows(selectedTabId),
                indexedDBService.getUnsavedRows(selectedTabId),
                indexedDBService.getSelectedRows(selectedTabId),
                indexedDBService.getGridMeta(selectedTabId)
              ]);

            const hasStoredGrid = dbRows.length > 0 && dbColumns.length > 0;

            if (hasStoredGrid) {
              await Promise.all([
                get().updateRows(dbRows),
                get().updateColumns(dbColumns),
                get().updateEditedRows(dbEditedRows),
                get().updateRemovedRows(dbRemovedRows),
                get().updateUnsavedRows(dbUnsavedRows)
              ]);
              get().updateSelectedRows(dbSelectedRows, true);
            }

            if (dbGridMeta) {
              set(
                {
                  gridEditable: dbGridMeta.gridEditable,
                  updatableNodeId: dbGridMeta.updatableNodeId,
                  editableReason: dbGridMeta.editableReason,
                  drivingTable: dbGridMeta.drivingTable
                },
                undefined,
                'loadGridMeta'
              );
            }

            get().toggleDataFetching(false);
            if (hasStoredGrid) {
              return {
                rows: dbRows,
                columns: dbColumns.filter((column) => column.isActive)
              };
            }

            return null;
          } catch (error) {
            get().toggleDataFetching(false);
            console.error('Error loading data from IndexedDB:', error);
            return null;
          }
        },
        ...createDataRowSlice(set, get, ...state),
        ...createDataEditedRowsSlice(set, get, ...state),
        ...createDataRemovedRowsSlice(set, get, ...state),
        ...createDataUnsavedRowsSlice(set, get, ...state),
        ...createDataSelectedRowsSlice(set, get, ...state),
        ...createDataColumnSlice(set, get, ...state),
        ...createDataQuerySlice(set, get, ...state),
        ...createDataFormDataSlice(set, get, ...state)
      }),
      { name: paneId === 0 ? 'data' : 'data-secondary' }
    )
  );

/** One data store per split-view pane, so two Data/Query tabs can show results side by side. */
const dataStores: Record<PaneId, StoreApi<DataState>> = { 0: createDataStore(0), 1: createDataStore(1) };

/** Store of the pane the caller renders in, or of the focused pane for callers outside any pane. */
export const useDataStoreApi = (): StoreApi<DataState> => {
  const pane = usePane();
  const focusedPane = useTabStore((state) => state.focusedPane);
  return dataStores[pane ?? focusedPane];
};

const focusedStore = (): StoreApi<DataState> => dataStores[useTabStore.getState().focusedPane];

type UseDataStore = {
  <T>(selector: (state: DataState) => T): T;
  getState: () => DataState;
  setState: StoreApi<DataState>['setState'];
};

/** Pane-aware drop-in for the former singleton store hook. Static access targets the focused pane. */
export const useDataStore: UseDataStore = Object.assign(
  <T>(selector: (state: DataState) => T): T => useStore(useDataStoreApi(), selector),
  {
    getState: (): DataState => focusedStore().getState(),
    setState: ((...args: Parameters<StoreApi<DataState>['setState']>): void =>
      focusedStore().setState(...args)) as StoreApi<DataState>['setState']
  }
);
