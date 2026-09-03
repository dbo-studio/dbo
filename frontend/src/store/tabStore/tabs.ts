import { TabMode } from '@/core/enums';
import type { TabType } from '@/types';

const knownModes = new Set<string>([
  TabMode.Data,
  TabMode.Query,
  TabMode.Object,
  TabMode.ObjectDetail,
  TabMode.Diagram
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
