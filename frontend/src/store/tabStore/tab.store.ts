import type { TabType } from '@/types';
import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { useConnectionStore } from '../connectionStore/connection.store';
import { createTabColumnSlice } from './slices/tabColumn.slice';
import { createTabFilterSlice } from './slices/tabFilter.slice';
import { createTabQuerySlice } from './slices/tabQuery.slice';
import { createTabSettingSlice } from './slices/tabSetting.slice';
import { createTabSortSlice } from './slices/tabSort.slice';
import type { TabDataSlice, TabFilterSlice, TabQuerySlice, TabSettingSlice, TabSortSlice, TabStore } from './types';

type TabState = TabStore & TabSettingSlice & TabQuerySlice & TabFilterSlice & TabSortSlice & TabDataSlice;

const initialize: { tabs: TabType[]; selectedTabId: string | undefined } = {
  tabs: [],
  selectedTabId: undefined
};

export const useTabStore: UseBoundStore<StoreApi<TabState>> = create<TabState>()(
  devtools(
    persist(
      (set, get, ...state) => ({
        ...initialize,
        reset: (): void => {
          set({ ...initialize }, undefined, 'reset');
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
              set({ selectedTabId: selectedTab.id }, undefined, 'selectedTab');
            }

            return selectedTab;
          }

          return get().tabs.find((t) => t.connectionId === currentConnectionId && t.id === get().selectedTabId);
        },
        updateTabs: (newTabs: TabType[]): void => {
          set({ tabs: newTabs }, undefined, 'updateTabs');
        },
        updateSelectedTab: (newSelectedTab: TabType | undefined): void => {
          if (newSelectedTab === undefined) {
            set({ selectedTabId: undefined });
            return;
          }

          const tabs = get().tabs.map((t: TabType) => {
            if (
              t.id === newSelectedTab.id &&
              t.mode === newSelectedTab.mode &&
              t.connectionId === newSelectedTab.connectionId
            ) {
              return newSelectedTab;
            }
            return t;
          });

          set({ tabs, selectedTabId: newSelectedTab.id }, undefined, 'updateSelectedTab');
        },
        reorderTabs: (activeId: string, overId: string): void => {
          const currentConnectionId = useConnectionStore.getState().currentConnectionId;
          if (!currentConnectionId) return;

          const tabs = get().tabs;
          const activeIndex = tabs.findIndex((t) => t.id === activeId && t.connectionId === currentConnectionId);
          const overIndex = tabs.findIndex((t) => t.id === overId && t.connectionId === currentConnectionId);

          if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) return;

          const newTabs = [...tabs];
          const [removed] = newTabs.splice(activeIndex, 1);
          newTabs.splice(overIndex, 0, removed);

          set({ tabs: newTabs }, undefined, 'reorderTabs');
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
