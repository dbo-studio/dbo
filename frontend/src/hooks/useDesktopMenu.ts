import { useRemoveTab } from '@/components/common/Panels/hooks/useRemoveTab';
import api from '@/api';
import { openExternal } from '@/core/help/openExternal';
import { openDocs } from '@/core/help/openDocs';
import { openSettings } from '@/core/settings/openSettings';
import { streams } from '@/core/tauri';
import { tools } from '@/core/utils';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { useTreeStore } from '@/store/treeStore/tree.store';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { pickAndOpenSqlFile } from './useDesktopOpenFiles';

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
          case 'openSqlFile':
            void pickAndOpenSqlFile().catch(() => undefined);
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
            void (async () => {
              const known = useSettingStore.getState().general.release;
              if (known?.url) {
                await openExternal(known.url);
                return;
              }
              try {
                const response = await api.config.getCheckUpdate();
                if (response.name !== useSettingStore.getState().general.version) {
                  useSettingStore.getState().updateGeneral({ release: response });
                  return;
                }
                toast.success(locales.you_are_up_to_date);
              } catch {
                toast.error(locales.action_failed);
              }
            })();
            break;
          case 'refreshTree':
            void reloadTree(false).catch(() => undefined);
            break;
          case 'openDocumentation':
            void openDocs();
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
