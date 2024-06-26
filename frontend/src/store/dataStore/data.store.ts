import { createAutocompleteSlice } from '@/store/dataStore/slices/dataAutocomplete.slice';
import { TabType } from '@/types';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
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
  AutocompleteSlice,
  DataColumnSlice,
  DataEditedRowsSlice,
  DataHighlightedRowSlice,
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
  DataHighlightedRowSlice &
  DataEditedRowsSlice &
  DataRemovedRowsSlice &
  DataUnsavedRowsSlice &
  DataColumnSlice &
  DataQuerySlice &
  AutocompleteSlice;

export const useDataStore = create<DataState>()(
  devtools(
    immer((set, get, ...state) => ({
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
      ...createDataQuerySlice(set, get, ...state),
      ...createAutocompleteSlice(set, get, ...state)
    })),
    { name: 'data' }
  )
);
