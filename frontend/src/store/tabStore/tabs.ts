import type { TabType } from '@/types';

export const coerceTabs = (tabs: unknown): TabType[] => (Array.isArray(tabs) ? tabs : []);

export const selectTabs = (state: { tabs: unknown }): TabType[] => coerceTabs(state.tabs);
