import { TabType } from '@/src/types';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useTabStore } from '../tabStore/tab.store';
import { createDataColumnSlice } from './slices/dataColumn.slice';
import { createDataEditedRowsSlice } from './slices/dataEditedRows';
import { createDataHightedRowSlice } from './slices/dataHightedRow.slice';
import { createDataQuerySlice } from './slices/dataQuery.slice';
import { createDataRemovedRowsSlice } from './slices/dataRemovedRows';
import { createDataRowSlice } from './slices/dataRow.slice';
import { createDataSelectedRowsSlice } from './slices/dataSelectedRows.slice';
import { createDataUnsavedRowsSlice } from './slices/dataUnsavedRows';
import {
  DataColumnSlice,
  DataEditedRowsSlice,
  DataHightedRowSlice,
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
  DataHightedRowSlice &
  DataEditedRowsSlice &
  DataRemovedRowsSlice &
  DataUnsavedRowsSlice &
  DataColumnSlice &
  DataQuerySlice;

export const useDataStore = create<DataState>()(
  devtools(
    (set, get, ...state) => ({
      selectedTab: (): TabType | undefined => {
        return useTabStore.getState().selectedTab;
      },
      ...createDataRowSlice(set, get, ...state),
      ...createDataHightedRowSlice(set, get, ...state),
      ...createDataEditedRowsSlice(set, get, ...state),
      ...createDataRemovedRowsSlice(set, get, ...state),
      ...createDataUnsavedRowsSlice(set, get, ...state),
      ...createDataSelectedRowsSlice(set, get, ...state),
      ...createDataColumnSlice(set, get, ...state),
      ...createDataQuerySlice(set, get, ...state)
    }),
    { name: 'data' }
  )
);