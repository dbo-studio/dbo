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
import {
  coerceTabs,
  resolvePaneSelectedTab,
  selectionPatch,
  selectPaneTabs,
  selectTabs,
  selectVisibleTabs,
  tabPane,
  type PaneId,
  type SelectedByPane
} from './tabs';

type TabPersistedState = Pick<TabStore, 'tabs' | 'selectedTabId' | 'selectedByPane' | 'focusedPane'>;

type TabState = TabStore & TabSettingSlice & TabQuerySlice & TabFilterSlice & TabSortSlice & TabDataSlice;

const initialize: {
  tabs: TabType[];
  selectedTabId: string | undefined;
  selectedByPane: SelectedByPane;
  focusedPane: PaneId;
} = {
  tabs: [],
  selectedTabId: undefined,
  selectedByPane: {},
  focusedPane: 0
};

export { selectPaneTabs, selectTabs, selectVisibleTabs } from './tabs';

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
          const active = tabs.find((tab) => tab.id === activeId);
          if (!active) return;

          const visible = selectPaneTabs(tabs, currentConnectionId, tabPane(active));
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
        moveTabToPane: (tabId: string, pane: PaneId, overId?: string): void => {
          const tabs = selectTabs(get());
          const currentConnectionId = useConnectionStore.getState().currentConnectionId;
          const moving = tabs.find((tab) => tab.id === tabId);
          if (!moving) return;

          const source = tabPane(moving);
          const sourceTabs = selectPaneTabs(tabs, currentConnectionId, source);
          // Moving the only tab of the primary pane into an empty secondary pane would leave no primary pane.
          if (
            source !== pane &&
            source === 0 &&
            sourceTabs.length === 1 &&
            selectPaneTabs(tabs, currentConnectionId, 1).length === 0
          ) {
            return;
          }

          const moved: TabType = { ...moving, pane: pane === 1 ? 1 : undefined };
          let next = tabs.filter((tab) => tab.id !== tabId);
          const overIndex = overId ? next.findIndex((tab) => tab.id === overId) : -1;
          if (overIndex >= 0) {
            next.splice(overIndex, 0, moved);
          } else {
            next = [...next, moved];
          }

          // Pane 0 emptied by the move: pull secondary tabs back to primary so a primary pane always exists.
          if (selectPaneTabs(next, currentConnectionId, 0).length === 0) {
            next = next.map((tab) => (tab.pane === 1 ? { ...tab, pane: undefined } : tab));
          }

          const selectedByPane: SelectedByPane = { ...get().selectedByPane };
          if (selectedByPane[source] === tabId) delete selectedByPane[source];
          set({ tabs: next, ...selectionPatch(next, selectedByPane, tabId) }, undefined, 'moveTabToPane');
        },
        splitRight: (tabId: string): void => {
          get().moveTabToPane(tabId, 1);
        },
        focusPane: (pane: PaneId): void => {
          if (get().focusedPane === pane) return;

          const tabs = selectTabs(get());
          const currentConnectionId = useConnectionStore.getState().currentConnectionId;
          const target = resolvePaneSelectedTab(
            selectPaneTabs(tabs, currentConnectionId, pane),
            get().selectedByPane,
            pane
          );
          if (!target) return;

          set(selectionPatch(tabs, get().selectedByPane, target.id), undefined, 'focusPane');
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
          selectedTabId: state.selectedTabId,
          selectedByPane: state.selectedByPane,
          focusedPane: state.focusedPane
        }),
        merge: (persistedState, currentState) => {
          const persisted = persistedState as Partial<TabPersistedState> | undefined;

          return {
            ...currentState,
            ...persisted,
            tabs: coerceTabs(persisted?.tabs ?? currentState.tabs),
            selectedTabId: persisted?.selectedTabId ?? currentState.selectedTabId,
            selectedByPane: persisted?.selectedByPane ?? currentState.selectedByPane,
            focusedPane: persisted?.focusedPane === 1 ? 1 : 0
          };
        }
      }
    ),
    {
      name: 'tabs'
    }
  )
);

/** Selected tab of a pane, resolved the same way `useSelectedTab` does inside that pane. */
export const selectPaneSelectedTab = <T extends TabType>(pane: PaneId): T | undefined => {
  const { tabs, selectedByPane } = useTabStore.getState();
  const currentConnectionId = useConnectionStore.getState().currentConnectionId;
  return resolvePaneSelectedTab(
    selectPaneTabs(selectTabs({ tabs }), currentConnectionId, pane),
    selectedByPane,
    pane
  ) as T | undefined;
};

export const selectPaneSelectedTabId = (pane: PaneId): string | undefined => selectPaneSelectedTab(pane)?.id;
