import type { TabType } from '@/types';
import { create } from 'zustand';
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

export const useDataStore = create<DataState>()(
  devtools(
    (set, get, ...state) => ({
      selectedTab: (): TabType | undefined => {
        return useTabStore.getState().getSelectedTab();
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
