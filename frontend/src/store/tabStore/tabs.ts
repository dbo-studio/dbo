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
  const allKnown = typed.every((tab) => tab && knownModes.has(tab.mode));
  return allKnown ? typed : typed.filter((tab) => tab && knownModes.has(tab.mode));
};

export const selectTabs = (state: { tabs: unknown }): TabType[] => coerceTabs(state.tabs);

/** Connection-scoped tabs plus the Settings singleton (if any), even with no connection. */
export const selectVisibleTabs = (tabs: TabType[], currentConnectionId: string | number | undefined): TabType[] => {
  const settingsTabs = tabs.filter((tab) => tab.mode === TabMode.Settings);
  if (!currentConnectionId) {
    return settingsTabs;
  }

  const connectionTabs = tabs.filter(
    (tab) => tab.mode !== TabMode.Settings && matchConnectionId(tab.connectionId, currentConnectionId)
  );
  return [...connectionTabs, ...settingsTabs];
};
