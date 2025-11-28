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
import type {
  DataColumnSlice,
  DataEditedRowsSlice,
  DataFormDataSlice,
  DataQuerySlice,
  DataRemovedRowsSlice,
  DataRowSlice,
  DataSelectedRowsSlice,
  DataStore,
  DataUnsavedRowsSlice
} from './types';

type DataState = DataStore &
  DataRowSlice &
  DataSelectedRowsSlice &
  DataEditedRowsSlice &
  DataRemovedRowsSlice &
  DataUnsavedRowsSlice &
  DataColumnSlice &
  DataQuerySlice &
  DataFormDataSlice;

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

        try {
          const dbRows = await indexedDBService.getRows(selectedTabId);
          const dbColumns = await indexedDBService.getColumns(selectedTabId);
          const dbEditedRows = await indexedDBService.getEditedRows(selectedTabId);
          const dbRemovedRows = await indexedDBService.getRemovedRows(selectedTabId);
          const dbUnsavedRows = await indexedDBService.getUnsavedRows(selectedTabId);
          const dbSelectedRows = await indexedDBService.getSelectedRows(selectedTabId);

          get().updateRows(dbRows);
          get().updateColumns(dbColumns);
          get().updateEditedRows(dbEditedRows);
          get().updateRemovedRows(dbRemovedRows);
          get().updateUnsavedRows(dbUnsavedRows);
          get().updateSelectedRows(dbSelectedRows, true);

          if (dbRows.length > 0 && dbColumns.length > 0) {
            get().toggleDataFetching(false);
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
