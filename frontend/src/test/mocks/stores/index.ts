import type { ConfirmModalModel, ConfirmModalStore } from '@/store/confirmModal/types';
import type { ConnectionStore, LoadingType } from '@/store/connectionStore/types';
import type { DataStore } from '@/store/dataStore/types';
import type { SettingStore } from '@/store/settingStore/types';
import type { TabStore } from '@/store/tabStore/types';
import type { TreeStore } from '@/store/treeStore/types';
import { vi } from 'vitest';

// Default mock implementations for all stores
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

export const defaultDataStoreMock: DataStore = {
  loadDataFromIndexedDB: vi.fn().mockResolvedValue(null)
};

export const defaultTabStoreMock: TabStore = {
  tabs: [],
  selectedTabId: undefined,
  selectedTab: vi.fn().mockReturnValue(undefined),
  reset: vi.fn(),
  getTabs: vi.fn().mockReturnValue([]),
  updateTabs: vi.fn(),
  updateSelectedTab: vi.fn()
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

export const createDataStoreMock = (overrides: Partial<DataStore> = {}): DataStore => ({
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
