import { TabType } from '@/src/types/Tab';
import { v4 as uuidv4 } from 'uuid';
import { StateCreator } from 'zustand';
import { TabSettingSlice, TabStore } from '../types';

const maxTabs = 15;

export const createTabSettingSlice: StateCreator<TabStore & TabSettingSlice, [], [], TabSettingSlice> = (
  set,
  get,
  store
) => ({
  addTab: (table: string) => {
    const tabs = get().tabs;

    const findTab = tabs.filter((t: TabType) => t.table == table);
    if (findTab.length > 0) {
      get().switchTab(findTab[0].id);
      return;
    }

    const newTab = {
      id: uuidv4(),
      table: table,
      query: `SELECT * FROM ${table}`,
      filters: [],
      sorts: [],
      showColumns: false,
      showFilters: false,
      showQuery: false,
      showSorts: false
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