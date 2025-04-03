import type { TabMode } from '@/core/enums';
import type { FilterType, SortType, TabType } from '@/types/Tab';

export type TabStore = {
  tabs: Record<string, TabType[]>;
  selectedTab: Record<string, TabType | undefined>;
  reset: () => void;
  getTabs: () => TabType[];
  updateTabs: (tabs: TabType[]) => void;
  updateSelectedTab: (selectedTab: TabType | undefined) => void;
};

export type TabFilterSlice = {
  upsertFilters: (tab: TabType, filter: FilterType) => Promise<void>;
  removeFilter: (tab: TabType, filter: FilterType) => void;
  setShowFilters: (tab: TabType) => void;
};

export type TabSortSlice = {
  upsertSorts: (tab: TabType, sort: SortType) => Promise<void>;
  removeSort: (tab: TabType, sort: SortType) => void;
  setShowSorts: (tab: TabType) => void;
  updateSorts: (tab: TabType, sorts: SortType[]) => void;
};

export type TabSettingSlice = {
  addTab: (table: string, id?: string, mode?: TabMode, query?: string) => TabType;
  addObjectTab: (nodeId: string, action: string, mode: TabMode) => TabType;
  addEditorTab: () => TabType;
  //return undefined will redirect to route /
  removeTab: (selectedTab: TabType, tabId: string) => TabType | null | undefined;
  switchTab: (tabId: string | null) => void;
  handleAddNewTab: (tabs: TabType[], newTab: TabType) => TabType;
};

export type TabQuerySlice = {
  getQuery: (tab: TabType) => string;
  updateQuery: (tab: TabType, query: string) => void;
  setShowQueryPreview: (tab: TabType) => void;
};

export type TabDataSlice = {
  setShowColumns: (tab: TabType) => void;
  updateColumns: (tab: TabType, columns: string[]) => void;
};
