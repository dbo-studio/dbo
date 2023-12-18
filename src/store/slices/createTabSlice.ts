import { ColumnOrColumnGroup } from 'react-data-grid';
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
  updateQuery: (query: string) => void;
  updateSorts: (sort: Sort) => void;
  upsertFilters: (filter: Filter) => void;
  updateRows: (rows: any[]) => void;
  updateColumns: (columns: any[]) => void;
  setShowQueryPreview: (show: boolean) => void;
  setShowSorts: (show: boolean) => void;
  setShowFilters: (show: boolean) => void;
  setShowColumns: (show: boolean) => void;
  updateSelectedTab: (selectedTab: Tab) => void;
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
  updateQuery: (query: string) => {
    const selectedTab = get().selectedTab;
    if (!selectedTab) {
      return;
    }

    selectedTab.query = query;
    get().updateSelectedTab(selectedTab);
  },
  updateSorts: (sort: Sort) => {
    const selectedTab = get().selectedTab;
    if (!selectedTab) {
      return;
    }

    const findSort = selectedTab.sorts.find((f) => f.column === sort.column);
    if (!findSort) {
      selectedTab.sorts.push(sort);
    } else {
      findSort.value = sort.value;
      findSort.condition = sort.condition;
    }

    get().updateSelectedTab(selectedTab);
  },
  upsertFilters: (filter: Filter) => {
    const selectedTab = get().selectedTab;
    if (!selectedTab) {
      return;
    }

    const findFilter = selectedTab.filters.find((f) => f.column === filter.column);
    if (!findFilter) {
      selectedTab.filters.push(filter);
    } else {
      findFilter.value = filter.value;
      findFilter.condition = filter.condition;
    }

    get().updateSelectedTab(selectedTab);
  },
  updateRows: (rows: any[]) => {
    const selectedTab = get().selectedTab;
    if (!selectedTab) {
      return;
    }

    selectedTab.rows = rows;
    console.log(selectedTab);

    get().updateSelectedTab(selectedTab);
  },
  updateColumns: (columns: ColumnOrColumnGroup<any, any>[]) => {
    const selectedTab = get().selectedTab;
    if (!selectedTab) {
      return;
    }

    selectedTab.columns = columns;

    get().updateSelectedTab(selectedTab);
  },
  setShowQueryPreview: (show: boolean) => {
    const selectedTab = get().selectedTab;
    if (!selectedTab) {
      return;
    }

    selectedTab.showQuery = show;
    get().updateSelectedTab(selectedTab);
  },
  setShowSorts: (show: boolean) => {
    const selectedTab = get().selectedTab;
    if (!selectedTab) {
      return;
    }

    selectedTab.showSorts = show;
    get().updateSelectedTab(selectedTab);
  },
  setShowFilters: (show: boolean) => {
    const selectedTab = get().selectedTab;
    if (!selectedTab) {
      return;
    }

    selectedTab.showFilters = show;
    get().updateSelectedTab(selectedTab);
  },
  setShowColumns: (show: boolean) => {
    const selectedTab = get().selectedTab;
    if (!selectedTab) {
      return;
    }

    selectedTab.showColumns = show;
    get().updateSelectedTab(selectedTab);
  },

  updateSelectedTab: (selectedTab: Tab) => {
    const tabs = get().tabs;

    tabs.map((t: Tab) => {
      if (t.id == selectedTab.id) {
        return selectedTab;
      }
    });

    set({ tabs, selectedTab });
  }
});
