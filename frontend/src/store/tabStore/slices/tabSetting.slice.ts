import { TabMode } from '@/core/enums';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import type { TabType } from '@/types/Tab';
import { v4 as uuidv4 } from 'uuid';
import type { StateCreator } from 'zustand';
import type { TabSettingSlice, TabStore } from '../types';

const maxTabs = 15;

export const createTabSettingSlice: StateCreator<TabStore & TabSettingSlice, [], [], TabSettingSlice> = (_, get) => ({
  addTab: (table: string, id?: string, editable?: boolean): TabType => {
    const currentConnectionId = useConnectionStore.getState().currentConnectionId;
    if (!currentConnectionId) {
      throw new Error('No current connection id');
    }

    const tabs = get().getTabs();

    const findTab = tabs.find((t: TabType) => t.mode === TabMode.Data && t.table === table);

    if (findTab) {
      get().switchTab(findTab.id);
      return findTab;
    }

    const newTab: TabType = {
      id: uuidv4(),
      connectionId: currentConnectionId,
      nodeId: id ?? '',
      table: table,
      query: `SELECT * FROM ${table}`,
      options: {
        editable: editable === undefined ? false : editable
      },
      filters: [],
      sorts: [],
      columns: [],
      pagination: {
        page: 1,
        limit: 100
      },
      showColumns: false,
      showFilters: false,
      showQuery: false,
      showSorts: false,
      mode: TabMode.Data
    };

    if (tabs.length < maxTabs) {
      get().updateTabs([...tabs, newTab]);
    } else {
      get().updateTabs([...tabs.slice(1), newTab]);
    }
    get().switchTab(newTab.id);

    return newTab;
  },

  addEditorTab: (query?: string): TabType => {
    const currentConnectionId = useConnectionStore.getState().currentConnectionId;
    if (!currentConnectionId) {
      throw new Error('No current connection id');
    }

    const tabs = get().getTabs();
    const findTab = tabs.find((t: TabType) => t.mode === TabMode.Query && (t.query === '' || t.query === '""'));

    if (findTab) {
      findTab.mode = TabMode.Query;
      get().switchTab(findTab.id);
      return findTab;
    }

    const newTab: TabType = {
      id: uuidv4(),
      table: query ? query.slice(0, 10) : 'Editor',
      connectionId: currentConnectionId,
      nodeId: 'Editor',
      mode: TabMode.Query,
      query: query ? query : '',
      options: {
        database: '',
        schema: ''
      }
    };

    return get().handleAddNewTab(tabs, newTab);
  },
  addObjectTab: (nodeId: string, action: string, mode: TabMode): TabType => {
    const currentConnectionId = useConnectionStore.getState().currentConnectionId;
    if (!currentConnectionId) {
      throw new Error('No current connection id');
    }

    const tabs = get().getTabs();
    const findTab = tabs.find((t: TabType) => t.mode === mode && t.nodeId === nodeId);

    if (findTab) {
      get().switchTab(findTab.id);
      return findTab;
    }

    const newTab: TabType = {
      id: uuidv4(),
      connectionId: currentConnectionId,
      nodeId: nodeId,
      mode: mode,
      options: {
        action: action
      }
    };

    return get().handleAddNewTab(tabs, newTab);
  },
  removeTab: (selectedTab: TabType, tabId: string): TabType | null | undefined => {
    const tabIndex = get()
      .getTabs()
      .findIndex((t: TabType) => t.id === tabId);
    const newTabs = get()
      .getTabs()
      .filter((t: TabType) => t.id !== tabId);

    let newTab: TabType | null | undefined = null;

    if (newTabs.length > tabIndex && selectedTab?.id === tabId) {
      newTab = newTabs[tabIndex];
    } else if (newTabs.length > 0 && selectedTab?.id === tabId) {
      newTab = newTabs[newTabs.length - 1];
    }

    if (newTab?.id === tabId) {
      get().switchTab(newTab?.id ?? null);
    }

    get().updateTabs(newTabs);
    return newTabs.length === 0 ? undefined : newTab;
  },
  switchTab: (tabId: string | null): void => {
    if (!tabId) {
      get().updateSelectedTab(undefined);
    }

    const findTab = get()
      .getTabs()
      .find((t) => t.id === tabId);
    if (findTab) {
      get().updateSelectedTab(findTab);
    }
  },

  handleAddNewTab: (tabs: TabType[], newTab: TabType): TabType => {
    if (tabs.length < maxTabs) {
      get().updateTabs([...tabs, newTab]);
    } else {
      get().updateTabs([...tabs.slice(1), newTab]);
    }
    get().switchTab(newTab.id);

    return newTab;
  }
});
