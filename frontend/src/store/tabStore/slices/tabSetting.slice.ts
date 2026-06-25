import { TabMode } from '@/core/enums';
import { tools } from '@/core/utils';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { matchConnectionId } from '@/store/tabStore/connectionId';
import type { DataTabType, EditorTabType, ObjectTabType, TabType } from '@/types/Tab';
import type { StateCreator } from 'zustand';
import type { TabQuerySlice, TabSettingSlice, TabStore } from '../types';

const maxTabs = 15;

export const createTabSettingSlice: StateCreator<
  TabStore & TabSettingSlice & TabQuerySlice,
  [['zustand/devtools', never]],
  [],
  TabSettingSlice
> = (set, get) => ({
  addDataTab: (table: string, id: string, editable?: boolean): DataTabType => {
    const currentConnectionId = useConnectionStore.getState().currentConnectionId;
    if (!currentConnectionId) {
      throw new Error('No current connection id');
    }

    const tabs = get().tabs as DataTabType[];

    const findTab = tabs.find(
      (tab) =>
        tab.mode === TabMode.Data && tab.table === table && matchConnectionId(tab.connectionId, currentConnectionId)
    );

    if (findTab) {
      get().switchTab(findTab.id);
      return findTab;
    }

    const newTab: DataTabType = {
      id: tools.uuid(),
      inlineQuery: '',
      connectionId: currentConnectionId,
      nodeId: id,
      name: table,
      table: table,
      editable: editable === undefined ? false : editable,
      filters: [],
      sorts: [],
      columns: [],
      pagination: {
        page: 1,
        limit: 50
      },
      showColumns: false,
      showFilters: false,
      showQuery: false,
      showSorts: false,
      mode: TabMode.Data
    };

    return get().handleAddNewTab(tabs, newTab) as DataTabType;
  },

  addEditorTab: (query?: string): EditorTabType => {
    const currentConnectionId = useConnectionStore.getState().currentConnectionId;
    if (!currentConnectionId) {
      throw new Error('No current connection id');
    }

    const tabs = get().tabs as EditorTabType[];
    const findTab = tabs.find(
      (tab) => tab.mode === TabMode.Query && matchConnectionId(tab.connectionId, currentConnectionId)
    );

    if (findTab && get().getQuery() == '') {
      get().switchTab(findTab.id);
      return findTab;
    }

    const newTab: EditorTabType = {
      id: tools.uuid(),
      name: query ? query.slice(0, 10) : 'Editor',
      connectionId: currentConnectionId,
      nodeId: '',
      mode: TabMode.Query,
      database: '',
      schema: ''
    };

    const addedTab = get().handleAddNewTab(tabs, newTab);
    if (query) {
      get().updateQuery(query);
    }
    return addedTab as EditorTabType;
  },
  addObjectTab: (title: string, nodeId: string, action: string, mode: TabMode): ObjectTabType => {
    const currentConnectionId = useConnectionStore.getState().currentConnectionId;
    if (!currentConnectionId) {
      throw new Error('No current connection id');
    }

    const tabs = get().tabs as ObjectTabType[];
    const findTab = tabs.find(
      (tab: TabType) =>
        tab.mode === mode && tab.nodeId === nodeId && matchConnectionId(tab.connectionId, currentConnectionId)
    );

    if (findTab) {
      get().switchTab(findTab.id);
      return findTab;
    }

    const newTab: ObjectTabType = {
      id: tools.uuid(),
      connectionId: currentConnectionId,
      name: title,
      nodeId: nodeId,
      mode: mode,
      action: action,
      objectTabId: null
    };

    return get().handleAddNewTab(tabs, newTab) as ObjectTabType;
  },
  removeTab: (tabId: string): TabType | null | undefined => {
    const tabs = get().tabs;
    const tabIndex = tabs.findIndex((tab) => tab.id === tabId);
    if (tabIndex === -1) {
      return null;
    }

    const newTabs = tabs.filter((tab) => tab.id !== tabId);
    const wasSelected = get().selectedTabId === tabId;

    get().removeQuery(tabId);

    let nextSelectedId = get().selectedTabId;
    let nextTab: TabType | null = null;

    if (wasSelected) {
      if (newTabs.length === 0) {
        nextSelectedId = undefined;
      } else if (tabIndex < newTabs.length) {
        nextTab = newTabs[tabIndex] ?? null;
        nextSelectedId = nextTab?.id;
      } else {
        nextTab = newTabs[newTabs.length - 1] ?? null;
        nextSelectedId = nextTab?.id;
      }
    }

    set({ tabs: newTabs, selectedTabId: nextSelectedId }, undefined, 'removeTab');

    if (newTabs.length === 0) {
      return undefined;
    }

    return wasSelected ? nextTab : null;
  },
  switchTab: (tabId: string | null): void => {
    if (!tabId) {
      set({ selectedTabId: undefined }, undefined, 'switchTab');
      return;
    }

    if (get().tabs.some((tab) => tab.id === tabId)) {
      set({ selectedTabId: tabId }, undefined, 'switchTab');
    }
  },

  handleAddNewTab: (_tabs: TabType[], newTab: TabType): TabType => {
    const tabs = get().tabs;
    const nextTabs = tabs.length < maxTabs ? [...tabs, newTab] : [...tabs.slice(1), newTab];

    set({ tabs: nextTabs, selectedTabId: newTab.id }, undefined, 'handleAddNewTab');

    return newTab;
  }
});
