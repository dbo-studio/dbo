import { connectionDatabase, resolveEditorContext } from '@/core/db';
import { TabMode } from '@/core/enums';
import { tools } from '@/core/utils';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { matchConnectionId } from '@/store/tabStore/connectionId';
import { siblingObjectNodeIds } from '@/store/tabStore/siblingObjectNodeIds';
import { selectTabs, selectVisibleTabs, SETTINGS_CONNECTION_ID } from '@/store/tabStore/tabs';
import { useTreeStore } from '@/store/treeStore/tree.store';
import type {
  DataTabType,
  DiagramTabType,
  EditorTabType,
  ObjectTabType,
  SettingsTabType,
  TabType
} from '@/types/Tab';
import type { StateCreator } from 'zustand';
import type { AddSettingsTabOptions, TabQuerySlice, TabSettingSlice, TabStore } from '../types';

const maxTabs = 15;

export const createTabSettingSlice: StateCreator<
  TabStore & TabSettingSlice & TabQuerySlice,
  [['zustand/devtools', never]],
  [],
  TabSettingSlice
> = (set, get) => ({
  addDataTab: (table: string, id: string, editable?: boolean): DataTabType => {
    const currentConnectionId = useConnectionStore.getState().currentConnectionId;
    if (!currentConnectionId) {
      throw new Error('No current connection id');
    }

    const tabs = selectTabs(get()) as DataTabType[];

    const findTab = tabs.find(
      (tab) =>
        tab.mode === TabMode.Data && tab.table === table && matchConnectionId(tab.connectionId, currentConnectionId)
    );

    if (findTab) {
      get().switchTab(findTab.id);
      return findTab;
    }

    const newTab: DataTabType = {
      id: tools.uuid(),
      inlineQuery: '',
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
        limit: 50
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

    const tabs = selectTabs(get()) as EditorTabType[];
    const findTab = tabs.find(
      (tab) => tab.mode === TabMode.Query && matchConnectionId(tab.connectionId, currentConnectionId)
    );

    const connection = useConnectionStore.getState().currentConnection();
    const lastUsed = useSettingStore.getState().editorContextByConnection[String(currentConnectionId)];
    const resolveFresh = () =>
      resolveEditorContext({
        engine: connection?.type,
        current: { database: '', schema: '' },
        connectionDatabase: connectionDatabase(connection),
        focusedNodeId: useTreeStore.getState().getFocusedNodeId(),
        siblingNodeIds: siblingObjectNodeIds(selectTabs(get()), currentConnectionId),
        lastUsed
      });

    if (findTab && get().getQuery() === '') {
      get().switchTab(findTab.id);

      if (findTab.contextLocked) {
        return findTab;
      }

      const resolved = resolveFresh();
      if (
        resolved.database === (findTab.database ?? '') &&
        resolved.schema === (findTab.schema ?? '') &&
        resolved.source === (findTab.contextSource ?? 'none')
      ) {
        return findTab;
      }

      const updated: EditorTabType = {
        ...findTab,
        database: resolved.database,
        schema: resolved.schema,
        contextSource: resolved.source,
        contextLocked: false
      };
      get().updateSelectedTab(updated);
      return updated;
    }

    const resolved = resolveFresh();

    const newTab: EditorTabType = {
      id: tools.uuid(),
      name: query ? query.slice(0, 10) : 'Editor',
      connectionId: currentConnectionId,
      nodeId: '',
      mode: TabMode.Query,
      database: resolved.database,
      schema: resolved.schema,
      contextLocked: false,
      contextSource: resolved.source,
      pagination: {
        page: 1,
        limit: 100
      }
    };

    const addedTab = get().handleAddNewTab(tabs, newTab);
    if (query) {
      get().updateQuery(query);
    }
    return addedTab as EditorTabType;
  },
  addDiagramTab: (args: { database: string; schema: string; focusTable?: string }): DiagramTabType => {
    const currentConnectionId = useConnectionStore.getState().currentConnectionId;
    if (!currentConnectionId) {
      throw new Error('No current connection id');
    }

    const focusTable = args.focusTable;
    const tabs = selectTabs(get()) as DiagramTabType[];
    const findTab = tabs.find(
      (tab) =>
        tab.mode === TabMode.Diagram &&
        tab.database === args.database &&
        tab.schema === args.schema &&
        (tab.focusTable ?? '') === (focusTable ?? '') &&
        matchConnectionId(tab.connectionId, currentConnectionId)
    );

    if (findTab) {
      get().switchTab(findTab.id);
      return findTab;
    }

    const newTab: DiagramTabType = {
      id: tools.uuid(),
      connectionId: currentConnectionId,
      nodeId: '',
      name: focusTable || args.schema || args.database || locales.diagram_tab,
      mode: TabMode.Diagram,
      database: args.database,
      schema: args.schema,
      focusTable
    };

    return get().handleAddNewTab(tabs, newTab) as DiagramTabType;
  },
  addObjectTab: (title: string, nodeId: string, action: string, mode: TabMode): ObjectTabType => {
    const currentConnectionId = useConnectionStore.getState().currentConnectionId;
    if (!currentConnectionId) {
      throw new Error('No current connection id');
    }

    const tabs = selectTabs(get()) as ObjectTabType[];
    const findTab = tabs.find(
      (tab: TabType) =>
        tab.mode === mode && tab.nodeId === nodeId && matchConnectionId(tab.connectionId, currentConnectionId)
    );

    if (findTab) {
      get().switchTab(findTab.id);
      return findTab;
    }

    const newTab: ObjectTabType = {
      id: tools.uuid(),
      connectionId: currentConnectionId,
      name: title,
      nodeId: nodeId,
      mode: mode,
      action: action,
      objectTabId: null
    };

    return get().handleAddNewTab(tabs, newTab) as ObjectTabType;
  },
  addSettingsTab: (options?: AddSettingsTabOptions): SettingsTabType => {
    const tabs = selectTabs(get());
    const section = options?.section ?? 0;
    const existing = tabs.find((tab): tab is SettingsTabType => tab.mode === TabMode.Settings);

    if (existing) {
      const updated: SettingsTabType = {
        ...existing,
        section,
        aiTab: options?.aiTab ?? existing.aiTab,
        query: options?.query,
        highlightId: options?.highlightId
      };
      const nextTabs = tabs.map((tab) => (tab.id === existing.id ? updated : tab));
      set({ tabs: nextTabs, selectedTabId: updated.id }, undefined, 'addSettingsTab');
      return updated;
    }

    const newTab: SettingsTabType = {
      id: tools.uuid(),
      name: locales.settings,
      connectionId: SETTINGS_CONNECTION_ID,
      nodeId: '',
      mode: TabMode.Settings,
      section,
      aiTab: options?.aiTab,
      query: options?.query,
      highlightId: options?.highlightId
    };

    return get().handleAddNewTab(tabs, newTab) as SettingsTabType;
  },
  removeTab: (tabId: string): TabType | null | undefined => {
    const tabs = selectTabs(get());
    const tabIndex = tabs.findIndex((tab) => tab.id === tabId);
    if (tabIndex === -1) {
      return null;
    }

    const newTabs = tabs.filter((tab) => tab.id !== tabId);
    const wasSelected = get().selectedTabId === tabId;

    get().removeQuery(tabId);

    let nextSelectedId = get().selectedTabId;
    let nextTab: TabType | null = null;

    if (wasSelected) {
      const currentConnectionId = useConnectionStore.getState().currentConnectionId;
      const visible = selectVisibleTabs(newTabs, currentConnectionId);
      if (visible.length === 0) {
        nextSelectedId = undefined;
      } else {
        // Prefer a connection tab at the same visual index when possible.
        const removedWasSettings = tabs[tabIndex]?.mode === TabMode.Settings;
        if (removedWasSettings) {
          nextTab = visible[visible.length - 1] ?? null;
        } else {
          const connectionVisible = visible.filter((tab) => tab.mode !== TabMode.Settings);
          const connectionIndex = tabs
            .filter((tab) => tab.mode !== TabMode.Settings)
            .findIndex((tab) => tab.id === tabId);
          nextTab =
            (connectionIndex >= 0 && connectionIndex < connectionVisible.length
              ? connectionVisible[connectionIndex]
              : connectionVisible[connectionVisible.length - 1]) ??
            visible[0] ??
            null;
        }
        nextSelectedId = nextTab?.id;
      }
    }

    set({ tabs: newTabs, selectedTabId: nextSelectedId }, undefined, 'removeTab');

    if (newTabs.length === 0) {
      return undefined;
    }

    return wasSelected ? nextTab : null;
  },
  switchTab: (tabId: string | null): void => {
    if (!tabId) {
      set({ selectedTabId: undefined }, undefined, 'switchTab');
      return;
    }

    if (selectTabs(get()).some((tab) => tab.id === tabId)) {
      set({ selectedTabId: tabId }, undefined, 'switchTab');
    }
  },

  handleAddNewTab: (_tabs: TabType[], newTab: TabType): TabType => {
    const tabs = selectTabs(get());

    if (newTab.mode === TabMode.Settings) {
      set({ tabs: [...tabs, newTab], selectedTabId: newTab.id }, undefined, 'handleAddNewTab');
      return newTab;
    }

    const settingsTabs = tabs.filter((tab) => tab.mode === TabMode.Settings);
    const otherTabs = tabs.filter((tab) => tab.mode !== TabMode.Settings);
    const nextOthers = otherTabs.length < maxTabs ? [...otherTabs, newTab] : [...otherTabs.slice(1), newTab];

    set({ tabs: [...nextOthers, ...settingsTabs], selectedTabId: newTab.id }, undefined, 'handleAddNewTab');

    return newTab;
  }
});
