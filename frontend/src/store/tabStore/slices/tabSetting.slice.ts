import { TabMode } from '@/core/enums';
import { TabType } from '@/types/Tab';
import { v4 as uuidv4 } from 'uuid';
import { StateCreator } from 'zustand';
import { TabSettingSlice, TabStore } from '../types';

const maxTabs = 15;

export const createTabSettingSlice: StateCreator<TabStore & TabSettingSlice, [], [], TabSettingSlice> = (_, get) => ({
  addTab: (table: string, mode?: TabMode, query?: string) => {
    mode = mode ? mode : TabMode.Data;
    const tabs = get().tabs;

    const findTab = tabs.filter((t: TabType) => t.table == table && t.mode == mode);
    if (findTab.length > 0) {
      get().switchTab(findTab[0].id);
      return;
    }

    let tabQuery = '';
    if (mode == TabMode.Data) {
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
  },
  removeTab: (tabId: string) => {
    const newTabs = get().tabs.filter((t: TabType) => t.id !== tabId);
    if (newTabs.length > 0) {
      get().switchTab(newTabs[newTabs.length - 1].id);
    } else {
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
