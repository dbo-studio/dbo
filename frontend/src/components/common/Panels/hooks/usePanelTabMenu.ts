import type { MenuType } from '@/components/base/ContextMenu/types.ts';
import locales from '@/locales';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import type { TabType } from '@/types';
import { useMemo } from 'react';
import { useRemoveTab } from './useRemoveTab';

export const usePanelTabMenu = (tab: TabType): MenuType[] => {
  const selectedTabId = useTabStore((state) => state.selectedTabId);
  const getTabs = useTabStore((state) => state.getTabs);
  const updateSelectedTab = useTabStore((state) => state.updateSelectedTab);
  const { handleRemoveTab } = useRemoveTab();

  const menu = useMemo<MenuType[]>(
    () => [
      {
        name: locales.close,
        action: (): void => {
          if (!tab) return;
          handleRemoveTab(tab.id);
        },
        closeAfterAction: true
      },
      {
        name: locales.close_other_tabs,
        action: (): void => {
          for (const t of getTabs()) {
            if (t.id !== selectedTabId) handleRemoveTab(t.id);
          }
        },
        closeAfterAction: true
      },
      {
        name: locales.close_all,
        action: (): void => {
          for (const t of getTabs()) {
            handleRemoveTab(t.id);
          }
          updateSelectedTab(undefined);
        },
        closeAfterAction: true
      }
    ],
    [tab, selectedTabId, getTabs, handleRemoveTab, updateSelectedTab]
  );

  return menu;
};
