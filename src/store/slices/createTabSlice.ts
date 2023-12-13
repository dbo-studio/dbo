import { v4 as uuidv4 } from "uuid";
import { StateCreator } from "zustand";

interface Sort {}
interface Filter {}

export interface Tab {
  id: string;
  table: string;
  query: string;
  showQuery: boolean;
  showColumns: boolean;
  showFilters: boolean;
  showSorts: boolean;
  sorts: Sort[];
  filters: Filter[];
}

const maxTabs = 5;

export interface TabSlice {
  tabs: Tab[];
  selectedTab: string | null;

  addTab: (table: string) => void;
  removeTab: (tabId: string) => void;
  switchTab: (tabId: string | null) => void;
  updateQuery: (tabId: string, query: string) => void;
  updateSorts: (tabId: string, sort: Sort) => void;
  updateFilters: (tabId: string, filter: Filter) => void;
  setShowQueryPreview: (tabId: string, show: boolean) => void;
  setShowSorts: (tabId: string, show: boolean) => void;
  setShowFilters: (tabId: string, show: boolean) => void;
  setShowColumns: (tabId: string, show: boolean) => void;
}

export const createTabSlice: StateCreator<TabSlice> = (set, get, store) => ({
  tabs: [],
  selectedTab: null,

  addTab: (table: string) => {
    const tabs = get().tabs;
    const newTab = {
      id: uuidv4(),
      table: table,
      query: `SELECT * FROM ${table}`,
      filters: [],
      sorts: [],
      showColumns: false,
      showFilters: false,
      showQuery: false,
      showSorts: false,
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
      set({ selectedTab: null });
    }

    const findTab = get().tabs.find((t) => t.id === tabId);
    if (findTab) {
      set({ selectedTab: tabId });
    }
  },
  updateQuery: (tabId: string, query: string) => {},
  updateSorts: (tabId: string, sort: Sort) => {},
  updateFilters: (tabId: string, filter: Filter) => {},
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
  setShowColumns: (tabId: string, sort: Sort) => {},
});
