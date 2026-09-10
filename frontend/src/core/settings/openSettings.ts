import type { AddSettingsTabOptions } from '@/store/tabStore/types';
import { useTabStore } from '@/store/tabStore/tab.store';

/** Open or focus the singleton Settings workspace tab. */
export function openSettings(options?: AddSettingsTabOptions): void {
  useTabStore.getState().addSettingsTab(options);
}
