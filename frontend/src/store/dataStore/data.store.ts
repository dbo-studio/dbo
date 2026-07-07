import { indexedDBService } from '@/core/indexedDB/indexedDB.service';
import type { ColumnType, RowType } from '@/types';
import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useTabStore } from '../tabStore/tab.store';
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

export const useDataStore: UseBoundStore<StoreApi<DataState>> = create<DataState>()(
  devtools(
    (set, get, ...state) => ({
      loadDataFromIndexedDB: async (): Promise<{
        rows: RowType[];
        columns: ColumnType[];
      } | null> => {
        const selectedTabId = useTabStore.getState().selectedTabId;
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
    { name: 'data' }
  )
);
