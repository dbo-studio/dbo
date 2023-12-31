import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

import { TabType } from '@/src/types';
import { TabDataSlice, createTabDataSlice } from './slices/tabData.slice';
import { TabFilterSlice, createTabFilterSlice } from './slices/tabFilter.slice';
import { TabQuerySlice, createTabQuerySlice } from './slices/tabQuery.slice';
import { TabSettingSlice, createTabSettingSlice } from './slices/tabSetting.slice';
import { TabSortSlice, createTabSortSlice } from './slices/tabSort.slice';

export type TabStore = {
  tabs: TabType[];
  selectedTab: TabType | undefined;
  updateTabs: (tabs: TabType[]) => void;
  updateSelectedTab: (selectedTab: TabType | undefined) => void;
};

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
