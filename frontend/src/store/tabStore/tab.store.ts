import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

import type { TabType } from '@/types';
import { useConnectionStore } from '../connectionStore/connection.store';
import { createTabColumnSlice } from './slices/tabColumn.slice';
import { createTabFilterSlice } from './slices/tabFilter.slice';
import { createTabQuerySlice } from './slices/tabQuery.slice';
import { createTabSettingSlice } from './slices/tabSetting.slice';
import { createTabSortSlice } from './slices/tabSort.slice';
import type { TabDataSlice, TabFilterSlice, TabQuerySlice, TabSettingSlice, TabSortSlice, TabStore } from './types';

type TabState = TabStore & TabSettingSlice & TabQuerySlice & TabFilterSlice & TabSortSlice & TabDataSlice;

export const useTabStore = create<TabState>()(
  devtools(
    persist(
      (set, get, ...state) => ({
        tabs: {},
        selectedTab: {},
        getTabs: (): TabType[] => {
          const currentConnection = useConnectionStore.getState().currentConnection;
          const tabs = get().tabs;
          if (!currentConnection || !tabs[currentConnection.id]) {
            return [];
          }

          return tabs[currentConnection.id];
        },
        getSelectedTab: (): TabType | undefined => {
          const currentConnection = useConnectionStore.getState().currentConnection;
          const selectedTab = get().selectedTab;
          if (!currentConnection) {
            return undefined;
          }

          if (selectedTab[currentConnection.id]) {
            return selectedTab[currentConnection.id];
          }

          const tabs = get().tabs;
          if (!tabs[currentConnection.id] || tabs[currentConnection.id].length === 0) {
            return undefined;
          }

          return tabs[currentConnection.id][0];
        },
        updateTabs: (newTabs: TabType[]) => {
          const currentConnection = useConnectionStore.getState().currentConnection;
          if (!currentConnection) {
            return;
          }

          const tabs = get().tabs;
          tabs[currentConnection.id] = newTabs;

          set({ tabs });
        },
        updateSelectedTab: (newSelectedTab: TabType | undefined) => {
          const currentConnection = useConnectionStore.getState().currentConnection;
          if (!currentConnection) {
            return;
          }

          const selectedTab = get().selectedTab;
          selectedTab[currentConnection.id] = newSelectedTab;
          if (newSelectedTab === undefined) {
            set({ selectedTab });
            return;
          }

          const tabs = get()
            .getTabs()
            .map((t: TabType) => {
              if (t.id === newSelectedTab.id) {
                return newSelectedTab;
              }
              return t;
            });

          const newTabs = get().tabs;
          newTabs[currentConnection.id] = tabs;

          set({ tabs: newTabs, selectedTab });
        },
        ...createTabSettingSlice(set, get, ...state),
        ...createTabQuerySlice(set, get, ...state),
        ...createTabFilterSlice(set, get, ...state),
        ...createTabSortSlice(set, get, ...state),
        ...createTabColumnSlice(set, get, ...state)
      }),
      { name: 'tabs' }
    ),
    {
      name: 'tabs'
    }
  )
);
