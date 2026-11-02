import { useExplorerAreaStore } from '@/store/explorerArea/explorerArea.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import type { AddBackupTabOptions } from '@/store/tabStore/types';
import { useTabStore } from '@/store/tabStore/tab.store';

/** Opens the Backup page in a tab and shows its list in the left sidebar. */
export function openBackup(options?: AddBackupTabOptions): void {
  useExplorerAreaStore.getState().setArea('backup');

  const { sidebar } = useSettingStore.getState().ui;
  if (!sidebar.showLeft) useSettingStore.getState().updateUI({ sidebar: { ...sidebar, showLeft: true } });

  useTabStore.getState().addBackupTab(options);
}
