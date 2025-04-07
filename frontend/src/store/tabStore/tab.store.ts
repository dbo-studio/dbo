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

const initialize = {
  tabs: [],
  selectedTabId: undefined
};

export const useTabStore = create<TabState>()(
  devtools(
    persist(
      (set, get, ...state) => ({
        ...initialize,
        reset: (): void => {
          set({ ...initialize });
        },
        getTabs: (): TabType[] => {
          const currentConnectionId = useConnectionStore.getState().currentConnectionId;
          if (!currentConnectionId) {
            return [];
          }

          return get().tabs.filter((t) => t.connectionId === currentConnectionId);
        },
        selectedTab: (): TabType | undefined => {
          const currentConnectionId = useConnectionStore.getState().currentConnectionId;
          if (!currentConnectionId) {
            return undefined;
          }

          if (!get().selectedTabId) {
            const selectedTab = get().tabs.find((t) => t.connectionId === currentConnectionId);
            if (selectedTab) {
              set({ selectedTabId: selectedTab.id });
            }

            return selectedTab;
          }

          return get().tabs.find((t) => t.connectionId === currentConnectionId && t.id === get().selectedTabId);
        },
        updateTabs: (newTabs: TabType[]): void => {
          const currentConnectionId = useConnectionStore.getState().currentConnectionId;
          if (!currentConnectionId) {
            return;
          }

          const tabs = get().tabs.filter((t) => t.connectionId !== currentConnectionId);
          tabs.push(...newTabs);

          set({ tabs });
        },
        updateSelectedTab: (newSelectedTab: TabType | undefined): void => {
          if (newSelectedTab === undefined) {
            set({ selectedTabId: undefined });
            return;
          }

          const tabs = get()
            .getTabs()
            .map((t: TabType) => {
              if (
                t.id === newSelectedTab.id &&
                t.mode === newSelectedTab.mode &&
                t.connectionId === newSelectedTab.connectionId
              ) {
                return newSelectedTab;
              }
              return t;
            });

          set({ tabs, selectedTabId: newSelectedTab.id });
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
