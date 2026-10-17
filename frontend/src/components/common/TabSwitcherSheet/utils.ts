import type { TabType } from '@/types';

/** Display name of a workspace tab (empty for tab types without a name). */
export const tabTitle = (tab: TabType | undefined): string =>
  tab && 'name' in tab && typeof tab.name === 'string' ? tab.name : '';
