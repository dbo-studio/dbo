import { v4 as uuidv4 } from 'uuid';
import { StateCreator } from 'zustand';
import { Filter, Sort, Tab } from '../types';

const maxTabs = 5;

export interface TabSlice {
  tabs: Tab[];
  selectedTab: Tab | undefined;

  addTab: (table: string) => void;
  removeTab: (tabId: string) => void;
  switchTab: (tabId: string | null) => void;
  updateQuery: (tabId: string, query: string) => void;
  updateSorts: (tabId: string, sort: Sort) => void;
  upsertFilters: (tabId: string, filter: Filter) => void;
  setShowQueryPreview: (tabId: string, show: boolean) => void;
  setShowSorts: (tabId: string, show: boolean) => void;
  setShowFilters: (tabId: string, show: boolean) => void;
  setShowColumns: (tabId: string, show: boolean) => void;
}

export const createTabSlice: StateCreator<TabSlice> = (set, get, store) => ({
  tabs: [],
  selectedTab: undefined,

  addTab: (table: string) => {
    const tabs = get().tabs;
    const newTab = {
      id: uuidv4(),
      table: table,
      query: `SELECT * FROM ${table}`,
      filters: [],
      sorts: [],
      rows: [],
      columns: [],
      showColumns: false,
      showFilters: false,
      showQuery: false,
      showSorts: false
    };

    if (tabs.length < maxTabs) {
      set({ tabs: [...tabs, newTab] });
    } else {
      set({ tabs: [...tabs.slice(1), newTab] });
    }
    get().switchTab(newTab.id);
  },
  removeTab: (tabId: string) => {
    const newTabs = get().tabs.filter((t: Tab) => t.id !== tabId);
    if (newTabs.length > 0) {
      get().switchTab(newTabs[newTabs.length - 1].id);
    } else {
      get().switchTab(null);
    }
    set({ tabs: newTabs });
  },
  switchTab: (tabId: string | null) => {
    if (!tabId) {
      set({ selectedTab: undefined });
    }

    const findTab = get().tabs.find((t) => t.id === tabId);
    if (findTab) {
      set({ selectedTab: findTab });
    }
  },
  updateQuery: (tabId: string, query: string) => {},
  updateSorts: (tabId: string, sort: Sort) => {
    const tabs = get().tabs;
    const findTab = tabs.find((t: Tab) => t.id === tabId);
    if (!findTab) {
      return;
    }

    const findSort = findTab.sorts.find((f) => f.column === sort.column);
    if (!findSort) {
      findTab.sorts.push(sort);
    } else {
      findSort.value = sort.value;
      findSort.condition = sort.condition;
    }
    set({ tabs });
  },
  upsertFilters: (tabId: string, filter: Filter) => {
    const tabs = get().tabs;
    const findTab = tabs.find((t: Tab) => t.id === tabId);
    if (!findTab) {
      return;
    }

    const findFilter = findTab.filters.find((f) => f.column === filter.column);
    if (!findFilter) {
      findTab.filters.push(filter);
    } else {
      findFilter.value = filter.value;
      findFilter.condition = filter.condition;
    }
    set({ tabs });
  },
  setShowQueryPreview: (tabId: string, show: boolean) => {
    const tabs = get().tabs;
    const findTab = tabs.find((t) => t.id === tabId);
    if (!findTab) {
      return;
    }

    findTab.showQuery = show;
    set({ tabs });
  },
  setShowSorts: (tabId: string, show: boolean) => {},
  setShowFilters: (tabId: string, show: boolean) => {},
  setShowColumns: (tabId: string, show: boolean) => {}
});
