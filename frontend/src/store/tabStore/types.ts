import type { TabMode } from '@/core/enums';
import type { FilterType, SortType, TabType } from '@/types/Tab';

export type TabStore = {
  tabs: TabType[];
  selectedTabId: string | undefined;
  selectedTab: () => TabType | undefined;
  reset: () => void;
  getTabs: () => TabType[];
  updateTabs: (tabs: TabType[]) => void;
  updateSelectedTab: (selectedTab: TabType | undefined) => void;
};

export type TabFilterSlice = {
  upsertFilters: (filter: FilterType) => void;
  removeFilter: (filter: FilterType) => void;
};

export type TabSortSlice = {
  upsertSorts: (sort: SortType) => Promise<void>;
  removeSort: (sort: SortType) => void;
  updateSorts: (sorts: SortType[]) => void;
};

export type TabSettingSlice = {
  addTab: (table: string, id?: string, editable?: boolean) => TabType;
  addObjectTab: (title: string, nodeId: string, action: string, mode: TabMode) => TabType;
  addEditorTab: (query?: string) => TabType;
  removeTab: (tabId: string) => TabType | null | undefined;
  switchTab: (tabId: string | null) => void;
  handleAddNewTab: (tabs: TabType[], newTab: TabType) => TabType;
};

export type TabQuerySlice = {
  getQuery: () => string;
  updateQuery: (query: string) => void;
};

export type TabDataSlice = {
  updateColumns: (columns: string[]) => void;
};
