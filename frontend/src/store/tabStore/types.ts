import type { TabMode } from '@/core/enums';
import type { PaneId, SelectedByPane } from './tabs';
import type { DiagramTabType, FilterType, SettingsTabType, SortType, TabType } from '@/types/Tab';

export type TabStore = {
  tabs: TabType[];
  selectedTabId: string | undefined;
  selectedByPane: SelectedByPane;
  focusedPane: PaneId;
  selectedTab: <T extends TabType>() => T | undefined;
  reset: () => void;
  getTabs: () => TabType[];
  updateTabs: (tabs: TabType[]) => void;
  updateSelectedTab: (selectedTab: TabType | undefined) => void;
  reorderTabs: (activeId: string, overId: string) => void;
  moveTabToPane: (tabId: string, pane: PaneId, overId?: string) => void;
  splitRight: (tabId: string) => void;
  focusPane: (pane: PaneId) => void;
};

export type TabFilterSlice = {
  upsertFilters: (filter: FilterType) => void;
  removeFilter: (filter: FilterType) => void;
  updateFilters: (filters: FilterType[]) => void;
};

export type TabSortSlice = {
  upsertSorts: (sort: SortType) => void;
  removeSort: (sort: SortType) => void;
  updateSorts: (sorts: SortType[]) => void;
};

export type AddSettingsTabOptions = {
  section?: number;
  aiTab?: 'providers' | 'mcp';
  query?: string;
  highlightId?: string;
};

export type TabSettingSlice = {
  addDataTab: (table: string, id: string, editable?: boolean) => TabType;
  addObjectTab: (title: string, nodeId: string, action: string, mode: TabMode) => TabType;
  addEditorTab: (query?: string, options?: { forceNew?: boolean }) => TabType;
  addDiagramTab: (args: { database: string; schema: string; focusTable?: string }) => DiagramTabType;
  addSettingsTab: (options?: AddSettingsTabOptions) => SettingsTabType;
  removeTab: (tabId: string) => TabType | null | undefined;
  switchTab: (tabId: string | null) => void;
  handleAddNewTab: (tabs: TabType[], newTab: TabType) => TabType;
};

export type TabQuerySlice = {
  getQuery: (tabId?: string) => string;
  updateQuery: (query: string, tabId?: string) => void;
  removeQuery: (tabId: string) => void;
  clearStoredQueries: () => void;
};

export type TabDataSlice = {
  updateColumns: (columns: string[]) => void;
};
