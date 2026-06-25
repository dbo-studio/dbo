import type { TabType } from '@/types';
import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { useConnectionStore } from '../connectionStore/connection.store';
import { matchConnectionId } from './connectionId';
import { createTabColumnSlice } from './slices/tabColumn.slice';
import { createTabFilterSlice } from './slices/tabFilter.slice';
import { createTabQuerySlice } from './slices/tabQuery.slice';
import { createTabSettingSlice } from './slices/tabSetting.slice';
import { createTabSortSlice } from './slices/tabSort.slice';
import type { TabDataSlice, TabFilterSlice, TabQuerySlice, TabSettingSlice, TabSortSlice, TabStore } from './types';

type TabPersistedState = Pick<TabStore, 'tabs' | 'selectedTabId'>;

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

          return get().tabs.filter((tab) => matchConnectionId(tab.connectionId, currentConnectionId));
        },
        selectedTab: <T extends TabType>(): T | undefined => {
          const currentConnectionId = useConnectionStore.getState().currentConnectionId;
          if (!currentConnectionId) {
            return undefined;
          }

          const connectionTabs = get().tabs.filter((tab) => matchConnectionId(tab.connectionId, currentConnectionId));
          if (connectionTabs.length === 0) {
            return undefined;
          }

          if (get().selectedTabId) {
            const activeTab = connectionTabs.find((tab) => tab.id === get().selectedTabId);
            if (activeTab) {
              return activeTab as T;
            }
          }

          return connectionTabs[0] as T;
        },
        updateTabs: (newTabs: TabType[]): void => {
          set({ tabs: newTabs }, undefined, 'updateTabs');
        },
        updateSelectedTab: (newSelectedTab: TabType | undefined): void => {
          if (newSelectedTab === undefined) {
            set({ selectedTabId: undefined });
            return;
          }

          const tabs = get().tabs.map((tab: TabType) => {
            if (
              tab.id === newSelectedTab.id &&
              tab.mode === newSelectedTab.mode &&
              matchConnectionId(tab.connectionId, newSelectedTab.connectionId)
            ) {
              return newSelectedTab;
            }
            return tab;
          });

          set({ tabs, selectedTabId: newSelectedTab.id }, undefined, 'updateSelectedTab');
        },
        reorderTabs: (activeId: string, overId: string): void => {
          const currentConnectionId = useConnectionStore.getState().currentConnectionId;
          if (!currentConnectionId) return;

          const tabs = get().tabs;
          const activeIndex = tabs.findIndex(
            (tab) => tab.id === activeId && matchConnectionId(tab.connectionId, currentConnectionId)
          );
          const overIndex = tabs.findIndex(
            (tab) => tab.id === overId && matchConnectionId(tab.connectionId, currentConnectionId)
          );

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
      {
        name: 'tabs',
        partialize: (state): TabPersistedState => ({
          tabs: state.tabs,
          selectedTabId: state.selectedTabId
        })
      }
    ),
    {
      name: 'tabs'
    }
  )
);
