import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

import { TabType } from '@/src/types';
import {
  TabDataSlice,
  TabFilterSlice,
  TabQuerySlice,
  TabSettingSlice,
  TabSortSlice,
  TabStore
} from '@/src/types/TabStore';
import { createTabDataSlice } from './slices/tabData.slice';
import { createTabFilterSlice } from './slices/tabFilter.slice';
import { createTabQuerySlice } from './slices/tabQuery.slice';
import { createTabSettingSlice } from './slices/tabSetting.slice';
import { createTabSortSlice } from './slices/tabSort.slice';

type TabState = TabStore & TabSettingSlice & TabQuerySlice & TabFilterSlice & TabSortSlice & TabDataSlice;

export const useTabStore = create<TabState>()(
  devtools(
    persist(
      (set, get, ...state) => ({
        tabs: [],
        selectedTab: undefined,

        updateTabs: (tabs: TabType[]) => {
          set({ tabs });
        },

        updateSelectedTab: (selectedTab: TabType | undefined) => {
          if (selectedTab == undefined) {
            set({ selectedTab });
            return;
          }

          const tabs = get().tabs;
          tabs.map((t: TabType) => {
            if (t.id == selectedTab.id) {
              return selectedTab;
            }
          });
          set({ tabs, selectedTab });
        },

        ...createTabSettingSlice(set, get, ...state),
        ...createTabQuerySlice(set, get, ...state),
        ...createTabFilterSlice(set, get, ...state),
        ...createTabSortSlice(set, get, ...state),
        ...createTabDataSlice(set, get, ...state)
      }),
      { name: 'tabs' }
    )
  )
);
