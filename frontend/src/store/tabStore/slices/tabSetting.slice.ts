import { TabMode } from '@/core/enums';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import type { DataTabType, EditorTabType, ObjectTabType, TabType } from '@/types/Tab';
import { v4 as uuidv4 } from 'uuid';
import type { StateCreator } from 'zustand';
import type { TabQuerySlice, TabSettingSlice, TabStore } from '../types';

const maxTabs = 15;

export const createTabSettingSlice: StateCreator<
  TabStore & TabSettingSlice & TabQuerySlice,
  [],
  [],
  TabSettingSlice
> = (_set, get) => ({
  addDataTab: (table: string, id: string, editable?: boolean): DataTabType => {
    const currentConnectionId = useConnectionStore.getState().currentConnectionId;
    if (!currentConnectionId) {
      throw new Error('No current connection id');
    }

    const tabs = get().tabs as DataTabType[];

    const findTab = tabs.find(
      (t) => t.mode === TabMode.Data && t.table === table && t.connectionId === currentConnectionId
    );

    if (findTab) {
      get().switchTab(findTab.id);
      return findTab;
    }

    const newTab: DataTabType = {
      id: uuidv4(),
      connectionId: currentConnectionId,
      nodeId: id,
      name: table,
      table: table,
      editable: editable === undefined ? false : editable,
      filters: [],
      sorts: [],
      columns: [],
      pagination: {
        page: 1,
        limit: 100
      },
      showColumns: false,
      showFilters: false,
      showQuery: false,
      showSorts: false,
      mode: TabMode.Data
    };

    return get().handleAddNewTab(tabs, newTab) as DataTabType;
  },

  addEditorTab: (query?: string): EditorTabType => {
    const currentConnectionId = useConnectionStore.getState().currentConnectionId;
    if (!currentConnectionId) {
      throw new Error('No current connection id');
    }

    const tabs = get().tabs as EditorTabType[];
    const findTab = tabs.find((t) => t.mode === TabMode.Query && t.connectionId === currentConnectionId);

    if (findTab) {
      findTab.mode = TabMode.Query;
      get().switchTab(findTab.id);
      return findTab;
    }

    const newTab: EditorTabType = {
      id: uuidv4(),
      name: query ? query.slice(0, 10) : 'Editor',
      connectionId: currentConnectionId,
      nodeId: '',
      mode: TabMode.Query,
      database: '',
      schema: ''
    };

    const addedTab = get().handleAddNewTab(tabs, newTab);
    if (query) {
      get().updateQuery(query);
    }
    return addedTab as EditorTabType;
  },
  addObjectTab: (title: string, nodeId: string, action: string, mode: TabMode): ObjectTabType => {
    const currentConnectionId = useConnectionStore.getState().currentConnectionId;
    if (!currentConnectionId) {
      throw new Error('No current connection id');
    }

    const tabs = get().tabs as ObjectTabType[];
    const findTab = tabs.find(
      (t: TabType) => t.mode === mode && t.nodeId === nodeId && t.connectionId === currentConnectionId
    );

    if (findTab) {
      get().switchTab(findTab.id);
      return findTab;
    }

    const newTab: ObjectTabType = {
      id: uuidv4(),
      connectionId: currentConnectionId,
      name: title,
      nodeId: nodeId,
      mode: mode,
      action: action,
      objectTabId: null
    };

    return get().handleAddNewTab(tabs, newTab) as ObjectTabType;
  },
  removeTab: (tabId: string): TabType | null | undefined => {
    const tabIndex = get().tabs.findIndex((t: TabType) => t.id === tabId);
    const newTabs = get().tabs.filter((t: TabType) => t.id !== tabId);

    let newTab: TabType | null | undefined = null;

    if (newTabs.length > tabIndex && get().selectedTabId === tabId) {
      newTab = newTabs[tabIndex];
    } else if (newTabs.length > 0 && get().selectedTabId === tabId) {
      newTab = newTabs[newTabs.length - 1];
    }

    get().removeQuery(tabId);

    if (newTab?.id === tabId) {
      get().switchTab(newTab?.id ?? null);
    }

    get().updateTabs(newTabs);
    return newTabs.length === 0 ? undefined : newTab;
  },
  switchTab: (tabId: string | null): void => {
    if (!tabId) {
      get().updateSelectedTab(undefined);
    }

    const findTab = get()
      .getTabs()
      .find((t) => t.id === tabId);
    if (findTab) {
      get().updateSelectedTab(findTab);
    }
  },

  handleAddNewTab: (tabs: TabType[], newTab: TabType): TabType => {
    if (tabs.length < maxTabs) {
      get().updateTabs([...tabs, newTab]);
    } else {
      get().updateTabs([...tabs.slice(1), newTab]);
    }
    get().switchTab(newTab.id);

    return newTab;
  }
});
