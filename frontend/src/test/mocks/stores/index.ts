import type { ConfirmModalModel, ConfirmModalStore } from '@/store/confirmModal/types';
import type { ConnectionStore, LoadingType } from '@/store/connectionStore/types';
import type {
  DataColumnSlice,
  DataEditedRowsSlice,
  DataFormDataSlice,
  DataQuerySlice,
  DataRemovedRowsSlice,
  DataRowSlice,
  DataSelectedRowsSlice,
  DataStore,
  DataUnsavedRowsSlice
} from '@/store/dataStore/types';
import type { SettingStore } from '@/store/settingStore/types';
import type {
  TabDataSlice,
  TabFilterSlice,
  TabQuerySlice,
  TabSettingSlice,
  TabSortSlice,
  TabStore
} from '@/store/tabStore/types';
import type { TreeStore } from '@/store/treeStore/types';
import { vi } from 'vitest';

export const defaultSettingStoreMock: SettingStore = {
  sidebar: {
    leftWidth: 285,
    rightWidth: 285,
    showLeft: true,
    showRight: true
  },
  isDark: false,
  debug: false,
  showAddConnection: false,
  showEditConnection: false,
  showQuickLookEditor: false,
  scrollToBottom: true,
  showSettings: false,
  toggleDebug: vi.fn(),
  updateSidebar: vi.fn(),
  toggleIsDark: vi.fn(),
  toggleShowAddConnection: vi.fn(),
  toggleShowEditConnection: vi.fn(),
  toggleShowQuickLookEditor: vi.fn(),
  toggleShowSettings: vi.fn(),
  toggleScrollToBottom: vi.fn()
};

export const defaultDataStoreMock: DataStore &
  Partial<
    DataColumnSlice &
    DataSelectedRowsSlice &
    DataRowSlice &
    DataEditedRowsSlice &
    DataRemovedRowsSlice &
    DataUnsavedRowsSlice &
    DataQuerySlice &
    DataFormDataSlice
  > = {
  // Core
  loadDataFromIndexedDB: vi.fn().mockResolvedValue(null),
  // Columns/Rows selections
  columns: [],
  selectedRows: [],
  getActiveColumns: vi.fn().mockReturnValue([]),
  updateColumns: vi.fn(),
  updateSelectedRows: vi.fn(),
  // Rows
  rows: [],
  getRow: vi.fn().mockReturnValue(null),
  updateRows: vi.fn().mockResolvedValue(undefined),
  updateRow: vi.fn().mockResolvedValue(undefined),
  // Edited/Removed/Unsaved rows
  editedRows: [],
  updateEditedRows: vi.fn().mockResolvedValue(undefined),
  restoreEditedRows: vi.fn().mockResolvedValue(undefined),
  removedRows: [],
  updateRemovedRows: vi.fn().mockResolvedValue(undefined),
  unSavedRows: [],
  addUnsavedRows: vi.fn(),
  updateUnsavedRows: vi.fn().mockResolvedValue(undefined),
  discardUnsavedRows: vi.fn(),
  // Query slice
  isDataFetching: false,
  reRunQuery: false,
  reRender: false,
  runQuery: vi.fn().mockResolvedValue(undefined),
  runRawQuery: vi.fn().mockResolvedValue(undefined),
  toggleReRunQuery: vi.fn(),
  toggleReRender: vi.fn(),
  toggleDataFetching: vi.fn(),
  // Form data slice
  formDataByTab: {},
  getFormData: vi.fn().mockReturnValue(undefined),
  updateFormData: vi.fn(),
  resetFormData: vi.fn()
};

export const defaultTabStoreMock: TabStore &
  Partial<TabSettingSlice & TabQuerySlice & TabFilterSlice & TabSortSlice & TabDataSlice> = {
  tabs: [],
  selectedTabId: undefined,
  selectedTab: vi.fn().mockReturnValue(undefined),
  reset: vi.fn(),
  getTabs: vi.fn().mockReturnValue([]),
  updateTabs: vi.fn(),
  updateSelectedTab: vi.fn(),
  // Optional slices (no-ops) for broader compatibility
  addTab: vi.fn(),
  addObjectTab: vi.fn(),
  addEditorTab: vi.fn(),
  removeTab: vi.fn().mockReturnValue(null),
  switchTab: vi.fn(),
  handleAddNewTab: vi.fn((_tabs, newTab) => newTab),
  getQuery: vi.fn().mockReturnValue(''),
  updateQuery: vi.fn(),
  removeQuery: vi.fn(),
  upsertFilters: vi.fn(),
  removeFilter: vi.fn(),
  upsertSorts: vi.fn().mockResolvedValue(undefined),
  updateSorts: vi.fn(),
  updateColumns: vi.fn()
};

export const defaultTreeStoreMock: TreeStore = {
  tree: {},
  expandedNodes: {},
  loadedParentIds: {},
  isLoading: false,
  treeError: undefined,
  setTree: vi.fn(),
  getTree: vi.fn().mockReturnValue(null),
  expandNode: vi.fn(),
  collapseNode: vi.fn(),
  isNodeExpanded: vi.fn().mockReturnValue(false),
  setNodeChildren: vi.fn(),
  addLoadedParentId: vi.fn(),
  getLoadedParentIds: vi.fn().mockReturnValue([]),
  reloadTree: vi.fn().mockResolvedValue(undefined),
  toggleIsLoading: vi.fn()
};

export const defaultConnectionStoreMock: ConnectionStore = {
  loading: 'finished' as LoadingType,
  connections: [],
  currentConnectionId: undefined,
  currentConnection: vi.fn().mockReturnValue(undefined),
  updateLoading: vi.fn(),
  updateConnections: vi.fn(),
  updateCurrentConnection: vi.fn()
};

export const defaultConfirmModalStoreMock: ConfirmModalStore = {
  isOpen: false,
  mode: 'success' as ConfirmModalModel,
  title: '',
  description: '',
  onCancel: vi.fn(),
  onSuccess: vi.fn(),
  open: vi.fn(),
  close: vi.fn(),
  show: vi.fn(),
  success: vi.fn(),
  danger: vi.fn(),
  warning: vi.fn()
};

// Store mock creators with partial overrides
export const createSettingStoreMock = (overrides: Partial<SettingStore> = {}): SettingStore => ({
  ...defaultSettingStoreMock,
  ...overrides
});

export const createDataStoreMock = (
  overrides: Partial<DataStore & DataColumnSlice & DataSelectedRowsSlice> = {}
): DataStore & Partial<DataColumnSlice> & Partial<DataSelectedRowsSlice> => ({
  ...defaultDataStoreMock,
  ...overrides
});

export const createTabStoreMock = (overrides: Partial<TabStore> = {}): TabStore => ({
  ...defaultTabStoreMock,
  ...overrides
});

export const createTreeStoreMock = (overrides: Partial<TreeStore> = {}): TreeStore => ({
  ...defaultTreeStoreMock,
  ...overrides
});

export const createConnectionStoreMock = (overrides: Partial<ConnectionStore> = {}): ConnectionStore => ({
  ...defaultConnectionStoreMock,
  ...overrides
});

export const createConfirmModalStoreMock = (overrides: Partial<ConfirmModalStore> = {}): ConfirmModalStore => ({
  ...defaultConfirmModalStoreMock,
  ...overrides
});
