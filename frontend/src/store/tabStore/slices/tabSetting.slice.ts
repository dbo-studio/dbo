import { connectionDatabase, resolveEditorContext } from '@/core/db';
import { TabMode } from '@/core/enums';
import { tools } from '@/core/utils';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { matchConnectionId } from '@/store/tabStore/connectionId';
import { siblingObjectNodeIds } from '@/store/tabStore/siblingObjectNodeIds';
import {
  selectionPatch,
  selectPaneTabs,
  selectTabs,
  selectVisibleTabs,
  SETTINGS_CONNECTION_ID,
  isGlobalTab,
  tabPane
} from '@/store/tabStore/tabs';
import { useTreeStore } from '@/store/treeStore/tree.store';
import type {
  QuestionTabType,
  DashboardTabType,
  DataTabType,
  DiagramTabType,
  EditorTabType,
  ObjectTabType,
  SettingsTabType,
  BackupTabType,
  TabType
} from '@/types/Tab';
import type { StateCreator } from 'zustand';
import type { AddBackupTabOptions, AddSettingsTabOptions, TabQuerySlice, TabSettingSlice, TabStore } from '../types';

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

  addEditorTab: (query?: string, options?: { forceNew?: boolean }): EditorTabType => {
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

    // An empty editor is reused unless the caller explicitly wants another one (phone shell's + button).
    if (findTab && !options?.forceNew && get().getQuery() === '') {
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
  addDiagramTab: (args: { database: string; schema: string; focusTables?: string[] }): DiagramTabType => {
    const currentConnectionId = useConnectionStore.getState().currentConnectionId;
    if (!currentConnectionId) {
      throw new Error('No current connection id');
    }

    const focusTables = args.focusTables?.length ? args.focusTables : undefined;
    const tabs = selectTabs(get()) as DiagramTabType[];
    const findTab = tabs.find(
      (tab) =>
        tab.mode === TabMode.Diagram &&
        tab.database === args.database &&
        tab.schema === args.schema &&
        (tab.focusTables ?? []).join(',') === (focusTables ?? []).join(',') &&
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
      name: focusTables?.join(', ') || args.schema || args.database || locales.diagram_tab,
      mode: TabMode.Diagram,
      database: args.database,
      schema: args.schema,
      focusTables
    };

    return get().handleAddNewTab(tabs, newTab) as DiagramTabType;
  },
  addDashboardTab: (dashboard: { id: number; name: string }): DashboardTabType => {
    const currentConnectionId = useConnectionStore.getState().currentConnectionId;
    if (!currentConnectionId) {
      throw new Error('No current connection id');
    }

    const tabs = selectTabs(get()) as DashboardTabType[];
    const findTab = tabs.find(
      (tab) =>
        tab.mode === TabMode.Dashboard &&
        tab.dashboardId === dashboard.id &&
        matchConnectionId(tab.connectionId, currentConnectionId)
    );

    if (findTab) {
      get().switchTab(findTab.id);
      return findTab;
    }

    const newTab: DashboardTabType = {
      id: tools.uuid(),
      connectionId: currentConnectionId,
      nodeId: `dashboard:${dashboard.id}`,
      name: dashboard.name,
      mode: TabMode.Dashboard,
      dashboardId: dashboard.id
    };

    return get().handleAddNewTab(tabs, newTab) as DashboardTabType;
  },
  addQuestionTab: (question: { id: number; name: string }): QuestionTabType => {
    const currentConnectionId = useConnectionStore.getState().currentConnectionId;
    if (!currentConnectionId) {
      throw new Error('No current connection id');
    }

    const tabs = selectTabs(get()) as QuestionTabType[];
    const findTab = tabs.find(
      (tab) =>
        tab.mode === TabMode.Question &&
        tab.questionId === question.id &&
        matchConnectionId(tab.connectionId, currentConnectionId)
    );

    if (findTab) {
      get().switchTab(findTab.id);
      return findTab;
    }

    const newTab: QuestionTabType = {
      id: tools.uuid(),
      connectionId: currentConnectionId,
      nodeId: `question:${question.id}`,
      name: question.name,
      mode: TabMode.Question,
      questionId: question.id
    };

    return get().handleAddNewTab(tabs, newTab) as QuestionTabType;
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
      set(
        { tabs: nextTabs, ...selectionPatch(nextTabs, get().selectedByPane, updated.id) },
        undefined,
        'addSettingsTab'
      );
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
  addBackupTab: (options?: AddBackupTabOptions): BackupTabType => {
    const tabs = selectTabs(get());
    const existing = tabs.find((tab): tab is BackupTabType => tab.mode === TabMode.Backup);

    if (existing) {
      const updated: BackupTabType = {
        ...existing,
        section: options?.section ?? existing.section,
        targetConnectionId: options?.connectionId ?? existing.targetConnectionId,
        database: options?.connectionId !== undefined ? options.database : existing.database,
        scheduleId: options?.scheduleId
      };
      const nextTabs = tabs.map((tab) => (tab.id === existing.id ? updated : tab));
      set({ tabs: nextTabs, ...selectionPatch(nextTabs, get().selectedByPane, updated.id) }, undefined, 'addBackupTab');
      return updated;
    }

    const newTab: BackupTabType = {
      id: tools.uuid(),
      name: locales.backup_restore,
      connectionId: SETTINGS_CONNECTION_ID,
      nodeId: '',
      mode: TabMode.Backup,
      section: options?.section ?? 'backups',
      targetConnectionId: options?.connectionId,
      database: options?.database,
      scheduleId: options?.scheduleId
    };

    return get().handleAddNewTab(tabs, newTab) as BackupTabType;
  },
  removeTab: (tabId: string): TabType | null | undefined => {
    const tabs = selectTabs(get());
    const tabIndex = tabs.findIndex((tab) => tab.id === tabId);
    if (tabIndex === -1) {
      return null;
    }

    const removed = tabs[tabIndex];
    const newTabs = tabs.filter((tab) => tab.id !== tabId);
    const wasSelected = get().selectedTabId === tabId;

    get().removeQuery(tabId);

    let nextSelectedId = get().selectedTabId;
    let nextTab: TabType | null = null;

    if (wasSelected) {
      const currentConnectionId = useConnectionStore.getState().currentConnectionId;
      const allVisible = selectVisibleTabs(newTabs, currentConnectionId);
      // Stay in the removed tab's pane; fall back to the other pane when it empties.
      const paneVisible = selectPaneTabs(newTabs, currentConnectionId, tabPane(removed));
      const visible = paneVisible.length > 0 ? paneVisible : allVisible;
      if (visible.length === 0) {
        nextSelectedId = undefined;
      } else {
        // Prefer a connection tab at the same visual index when possible.
        const removedWasSettings = removed ? isGlobalTab(removed) : false;
        if (removedWasSettings) {
          nextTab = visible[visible.length - 1] ?? null;
        } else {
          const connectionVisible = visible.filter((tab) => !isGlobalTab(tab));
          const connectionIndex = tabs
            .filter((tab) => !isGlobalTab(tab) && (tab.id === tabId || visible.some((v) => v.id === tab.id)))
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

    const selection = wasSelected
      ? selectionPatch(newTabs, get().selectedByPane, nextSelectedId)
      : { selectedTabId: nextSelectedId };
    set({ tabs: newTabs, ...selection }, undefined, 'removeTab');

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

    const tabs = selectTabs(get());
    if (tabs.some((tab) => tab.id === tabId)) {
      set(selectionPatch(tabs, get().selectedByPane, tabId), undefined, 'switchTab');
    }
  },

  handleAddNewTab: (_tabs: TabType[], addedTab: TabType): TabType => {
    const tabs = selectTabs(get());
    const newTab: TabType = get().focusedPane === 1 && !isGlobalTab(addedTab) ? { ...addedTab, pane: 1 } : addedTab;

    if (isGlobalTab(newTab)) {
      const nextTabs = [...tabs, newTab];
      set(
        { tabs: nextTabs, ...selectionPatch(nextTabs, get().selectedByPane, newTab.id) },
        undefined,
        'handleAddNewTab'
      );
      return newTab;
    }

    const otherTabs = tabs.filter((tab) => !isGlobalTab(tab));
    const nextTabs =
      otherTabs.length < maxTabs ? [...tabs, newTab] : [...tabs.filter((tab) => tab.id !== otherTabs[0].id), newTab];

    set({ tabs: nextTabs, ...selectionPatch(nextTabs, get().selectedByPane, newTab.id) }, undefined, 'handleAddNewTab');

    return newTab;
  }
});
