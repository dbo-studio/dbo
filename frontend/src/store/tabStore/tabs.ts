import { TabMode } from '@/core/enums';
import type { TabType } from '@/types';
import { matchConnectionId } from './connectionId';

/** Sentinel connectionId for the global Settings tab (numeric so matchConnectionId works). */
export const SETTINGS_CONNECTION_ID = -1;

const knownModes = new Set<string>([
  TabMode.Data,
  TabMode.Query,
  TabMode.Object,
  TabMode.ObjectDetail,
  TabMode.Diagram,
  TabMode.Settings
]);

const EMPTY_TABS: TabType[] = [];

export const coerceTabs = (tabs: unknown): TabType[] => {
  if (!Array.isArray(tabs)) {
    return EMPTY_TABS;
  }

  const typed = tabs as TabType[];
  const allValid = typed.every((tab) => tab && knownModes.has(tab.mode) && (tab.pane === undefined || tab.pane === 1));
  if (allValid) {
    return typed;
  }

  return typed
    .filter((tab) => tab && knownModes.has(tab.mode))
    .map((tab) => (tab.pane === undefined || tab.pane === 1 ? tab : { ...tab, pane: undefined }));
};

export const selectTabs = (state: { tabs: unknown }): TabType[] => coerceTabs(state.tabs);

/** Connection-scoped tabs plus the Settings singleton (if any), even with no connection. */
export const selectVisibleTabs = (tabs: TabType[], currentConnectionId: string | number | undefined): TabType[] => {
  if (!currentConnectionId) {
    return tabs.filter((tab) => tab.mode === TabMode.Settings);
  }

  return tabs.filter(
    (tab) => tab.mode === TabMode.Settings || matchConnectionId(tab.connectionId, currentConnectionId)
  );
};

export type PaneId = 0 | 1;
export type SelectedByPane = Partial<Record<PaneId, string>>;

export const tabPane = (tab: TabType): PaneId => (tab.pane === 1 ? 1 : 0);

export const selectPaneTabs = (
  tabs: TabType[],
  currentConnectionId: string | number | undefined,
  pane: PaneId
): TabType[] => selectVisibleTabs(tabs, currentConnectionId).filter((tab) => tabPane(tab) === pane);

/** Split is active while any visible tab lives in the secondary pane. */
export const isSplitActive = (tabs: TabType[], currentConnectionId: string | number | undefined): boolean =>
  selectVisibleTabs(tabs, currentConnectionId).some((tab) => tabPane(tab) === 1);

/** Selected tab of a pane: remembered selection when still in the pane, else the pane's first tab. */
export const resolvePaneSelectedTab = (
  paneTabs: TabType[],
  selectedByPane: SelectedByPane,
  pane: PaneId
): TabType | undefined => paneTabs.find((tab) => tab.id === selectedByPane[pane]) ?? paneTabs[0];

/** State patch that selects `tabId` and focuses its pane, keeping `selectedTabId` = focused pane's selection. */
export const selectionPatch = (
  tabs: TabType[],
  selectedByPane: SelectedByPane,
  tabId: string | undefined
): { selectedTabId: string | undefined; selectedByPane: SelectedByPane; focusedPane: PaneId } => {
  const tab = tabs.find((item) => item.id === tabId);
  if (!tab) {
    return { selectedTabId: undefined, selectedByPane, focusedPane: 0 };
  }

  const pane = tabPane(tab);
  return { selectedTabId: tab.id, selectedByPane: { ...selectedByPane, [pane]: tab.id }, focusedPane: pane };
};
