import { TabType } from '@/src/types';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useTabStore } from '../tabStore/tab.store';
import { createDataColumnSlice } from './slices/dataColumn.slice';
import { createDataQuerySlice } from './slices/dataQuery.slice';
import { createDataRowSlice } from './slices/dataRow.slice';
import { DataColumnSlice, DataQuerySlice, DataRowSlice, DataStore } from './types';

type DataState = DataStore & DataRowSlice & DataColumnSlice & DataQuerySlice;

export const useDataStore = create<DataState>()(
  devtools(
    (set, get, ...state) => ({
      selectedTab: (): TabType | undefined => {
        return useTabStore.getState().selectedTab;
      },
      ...createDataRowSlice(set, get, ...state),
      ...createDataColumnSlice(set, get, ...state),
      ...createDataQuerySlice(set, get, ...state)
    }),
    { name: 'data' }
  )
);
