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
import { coerceTabs, selectTabs, selectVisibleTabs } from './tabs';

type TabPersistedState = Pick<TabStore, 'tabs' | 'selectedTabId'>;

type TabState = TabStore & TabSettingSlice & TabQuerySlice & TabFilterSlice & TabSortSlice & TabDataSlice;

const initialize: { tabs: TabType[]; selectedTabId: string | undefined } = {
  tabs: [],
  selectedTabId: undefined
};

export { selectTabs, selectVisibleTabs } from './tabs';

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
          return selectVisibleTabs(selectTabs(get()), currentConnectionId);
        },
        selectedTab: <T extends TabType>(): T | undefined => {
          const visible = get().getTabs();
          if (visible.length === 0) {
            return undefined;
          }

          if (get().selectedTabId) {
            const activeTab = visible.find((tab) => tab.id === get().selectedTabId);
            if (activeTab) {
              return activeTab as T;
            }
          }

          return visible[0] as T;
        },
        updateTabs: (newTabs: TabType[]): void => {
          set({ tabs: newTabs }, undefined, 'updateTabs');
        },
        updateSelectedTab: (newSelectedTab: TabType | undefined): void => {
          if (newSelectedTab === undefined) {
            set({ selectedTabId: undefined });
            return;
          }

          const tabs = selectTabs(get()).map((tab: TabType) => {
            if (tab.id === newSelectedTab.id) {
              return newSelectedTab;
            }
            return tab;
          });

          set({ tabs, selectedTabId: newSelectedTab.id }, undefined, 'updateSelectedTab');
        },
        reorderTabs: (activeId: string, overId: string): void => {
          const tabs = selectTabs(get());
          const currentConnectionId = useConnectionStore.getState().currentConnectionId;
          const visible = selectVisibleTabs(tabs, currentConnectionId);
          const activeIndex = visible.findIndex((tab) => tab.id === activeId);
          const overIndex = visible.findIndex((tab) => tab.id === overId);

          if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) {
            return;
          }

          const nextVisible = [...visible];
          const [removed] = nextVisible.splice(activeIndex, 1);
          nextVisible.splice(overIndex, 0, removed);

          const visibleIds = new Set(visible.map((tab) => tab.id));
          let i = 0;
          const newTabs = tabs.map((tab) => (visibleIds.has(tab.id) ? nextVisible[i++] : tab));

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
        skipHydration: true,
        partialize: (state): TabPersistedState => ({
          tabs: selectTabs(state),
          selectedTabId: state.selectedTabId
        }),
        merge: (persistedState, currentState) => {
          const persisted = persistedState as Partial<TabPersistedState> | undefined;

          return {
            ...currentState,
            ...persisted,
            tabs: coerceTabs(persisted?.tabs ?? currentState.tabs),
            selectedTabId: persisted?.selectedTabId ?? currentState.selectedTabId
          };
        }
      }
    ),
    {
      name: 'tabs'
    }
  )
);
