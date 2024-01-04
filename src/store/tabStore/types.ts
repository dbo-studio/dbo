import { FilterType, SortType, TabType } from '@/src/types/Tab';

export type TabFilterSlice = {
  upsertFilters: (filter: FilterType) => void;
  removeFilter: (filter: FilterType) => void;
  setShowFilters: (show: boolean) => void;
};

export type TabSortSlice = {
  upsertSorts: (sort: SortType) => void;
  removeSort: (sort: SortType) => void;
  setShowSorts: (show: boolean) => void;
};

export type TabSettingSlice = {
  addTab: (table: string) => void;
  removeTab: (tabId: string) => void;
  switchTab: (tabId: string | null) => void;
};

export type TabQuerySlice = {
  updateQuery: (query: string) => void;
  setShowQueryPreview: (show: boolean) => void;
};

export type TabDataSlice = {
  setShowColumns: (show: boolean) => void;
};

export type TabStore = {
  tabs: TabType[];
  selectedTab: TabType | undefined;
  updateTabs: (tabs: TabType[]) => void;
  updateSelectedTab: (selectedTab: TabType | undefined) => void;
};
