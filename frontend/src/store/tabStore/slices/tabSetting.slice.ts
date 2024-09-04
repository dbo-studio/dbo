import { TabMode } from '@/core/enums';
import type { TabType } from '@/types/Tab';
import { v4 as uuidv4 } from 'uuid';
import type { StateCreator } from 'zustand';
import type { TabSettingSlice, TabStore } from '../types';

const maxTabs = 15;

export const createTabSettingSlice: StateCreator<TabStore & TabSettingSlice, [], [], TabSettingSlice> = (_, get) => ({
  addTab: (table: string, mode?: TabMode, query?: string): string => {
    // biome-ignore lint: reason
    mode = mode ? mode : TabMode.Data;
    const tabs = get().tabs;

    let findTab: TabType[];
    if (mode === TabMode.Query) {
      findTab = tabs.filter((t: TabType) => t.mode === TabMode.Query && (t.query === '' || t.query === '""'));
    } else {
      findTab = tabs.filter((t: TabType) => t.table === table && t.mode === mode);
    }

    if (findTab.length > 0) {
      get().switchTab(findTab[0].id);
      return findTab[0].id;
    }

    let tabQuery = '';
    if (mode === TabMode.Data) {
      tabQuery = `SELECT * FROM ${table}`;
    } else {
      tabQuery = query ? query : '';
    }

    const newTab: TabType = {
      id: uuidv4(),
      table: table,
      query: tabQuery,
      filters: [],
      sorts: [],
      columns: [],
      pagination: {
        page: 1,
        limit: 100,
        offset: 0
      },
      showColumns: false,
      showFilters: false,
      showQuery: false,
      showSorts: false,
      mode: mode ? mode : TabMode.Data
    };

    if (tabs.length < maxTabs) {
      get().updateTabs([...tabs, newTab]);
    } else {
      get().updateTabs([...tabs.slice(1), newTab]);
    }
    get().switchTab(newTab.id);

    return newTab.id;
  },
  removeTab: (tabId: string) => {
    const tabIndex = get().tabs.findIndex((t: TabType) => t.id === tabId);
    const newTabs = get().tabs.filter((t: TabType) => t.id !== tabId);

    if (newTabs.length > tabIndex && get().selectedTab?.id === tabId) {
      get().switchTab(newTabs[tabIndex].id);
    } else if (newTabs.length > 0 && get().selectedTab?.id === tabId) {
      get().switchTab(newTabs[newTabs.length - 1].id);
    } else if (newTabs.length === 0) {
      get().switchTab(null);
    }

    get().updateTabs(newTabs);
  },
  switchTab: (tabId: string | null) => {
    if (!tabId) {
      get().updateSelectedTab(undefined);
    }

    const findTab = get().tabs.find((t) => t.id === tabId);
    if (findTab) {
      get().updateSelectedTab(findTab);
    }
  }
});
