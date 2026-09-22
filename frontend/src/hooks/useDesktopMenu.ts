import { useRemoveTab } from '@/components/common/Panels/hooks/useRemoveTab';
import { constants } from '@/core/constants';
import { openSettings } from '@/core/settings/openSettings';
import { streams } from '@/core/tauri';
import { tools } from '@/core/utils';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { useTreeStore } from '@/store/treeStore/tree.store';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useEffect } from 'react';

/**
 * Bridges native app-menu clicks to existing React/store actions.
 * Must be mounted only after desktop boot succeeds (inside Layout).
 */
export const useDesktopMenu = (): void => {
  const updateUI = useSettingStore((state) => state.updateUI);
  const addEditorTab = useTabStore((state) => state.addEditorTab);
  const reloadTree = useTreeStore((state) => state.reloadTree);
  const { handleRemoveTab } = useRemoveTab();

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    void (async () => {
      if (!(await tools.isTauri())) {
        return;
      }

      unlisten = await streams.menu.onAction((id) => {
        switch (id) {
          case 'newConnection':
            updateUI({ showAddConnection: true, duplicateConnectionId: undefined });
            break;
          case 'newTab':
            addEditorTab();
            break;
          case 'closeTab': {
            const selectedTabId = useTabStore.getState().selectedTabId;
            if (selectedTabId) {
              void handleRemoveTab(selectedTabId);
            }
            break;
          }
          case 'openSettings':
            openSettings({ section: 0 });
            break;
          case 'openShortcuts':
            openSettings({ section: 2 });
            break;
          case 'openAbout':
            openSettings({ section: 5 });
            break;
          case 'checkUpdates':
            openSettings({ section: 0 });
            break;
          case 'refreshTree':
            void reloadTree(false).catch(() => undefined);
            break;
          case 'openDocumentation':
            void openUrl(constants.docsUrl).catch(() => undefined);
            break;
          default:
            break;
        }
      });
    })();

    return () => {
      unlisten?.();
    };
  }, [addEditorTab, handleRemoveTab, reloadTree, updateUI]);
};
