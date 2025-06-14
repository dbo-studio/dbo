import ContextMenu from '@/components/base/ContextMenu/ContextMenu.tsx';
import type { MenuType } from '@/components/base/ContextMenu/types.ts';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon.tsx';
import { PanelTabItemStyled } from '@/components/common/Panels/PanelTabs/PanelTabItem/PanelTabItem.styled.ts';
import { shortcuts } from '@/core/utils';
import { useContextMenu, useShortcut } from '@/hooks';
import { useRemoveTab } from '@/hooks/useRemoveTab.hook.ts';
import locales from '@/locales';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import type { TabType } from '@/types';
import { Box, Tooltip, Typography } from '@mui/material';
import type { JSX } from 'react';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';

const PanelTabItem = memo(({ tab }: { tab: TabType }): JSX.Element => {
  const selectedTabId = useTabStore((state) => state.selectedTabId);
  const tabRefs = useRef<Record<string, HTMLElement>>({});
  const [removeTab] = useRemoveTab();
  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();
  const addEditorTab = useTabStore((state) => state.addEditorTab);
  const getTabs = useTabStore((state) => state.getTabs);
  const updateSelectedTab = useTabStore((state) => state.updateSelectedTab);

  const menu = useMemo<MenuType[]>(
    () => [
      {
        name: locales.close,
        action: (): void => {
          if (!tab) return;
          removeTab(tab.id);
        },
        closeAfterAction: true
      },
      {
        name: locales.close_other_tabs,
        action: (): void => {
          for (const t of getTabs()) {
            if (t.id !== selectedTabId) removeTab(t.id);
          }
        },
        closeAfterAction: true
      },
      {
        name: locales.close_all,
        action: (): void => {
          for (const t of getTabs()) {
            removeTab(t.id);
          }
          updateSelectedTab(undefined);
        },
        closeAfterAction: true
      }
    ],
    [tab, selectedTabId, getTabs, removeTab, updateSelectedTab]
  );

  const handleSwitchTab = useCallback(
    (tabId: string): void => {
      const findTab = getTabs().find((t: TabType) => t.id === tabId);
      const selectedTabId = useTabStore.getState().selectedTabId;

      if (!findTab || findTab.id === selectedTabId) return;

      updateSelectedTab(findTab);
    },
    [getTabs, updateSelectedTab]
  );

  const handleRemoveTab = useCallback(
    (tabId: string): void => {
      if (!selectedTabId) return;

      const newTab = removeTab(tabId);
      if (newTab === undefined) {
        updateSelectedTab(undefined);
        return;
      }

      if (newTab) {
        updateSelectedTab(newTab);
      }
    },
    [selectedTabId, removeTab, updateSelectedTab]
  );

  const addNewEmptyTab = useCallback((): void => {
    const tab = addEditorTab();
    updateSelectedTab(tab);
  }, [addEditorTab, updateSelectedTab]);

  useShortcut(shortcuts.newTab, addNewEmptyTab);
  useShortcut(shortcuts.closeTab, () => handleRemoveTab(selectedTabId ?? ''));

  useEffect(() => {
    const tabId = selectedTabId;
    if (tabId && tabRefs.current?.[tabId]) {
      tabRefs.current[tabId].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [selectedTabId]);

  const handleTabClick = useCallback((): void => {
    handleSwitchTab(tab.id);
  }, [handleSwitchTab, tab.id]);

  const handleCloseClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>): void => {
      e.stopPropagation();
      handleRemoveTab(tab.id);
    },
    [handleRemoveTab, tab.id]
  );

  return (
    <Box
      onContextMenu={handleContextMenu}
      ref={(el: HTMLElement): void => {
        tabRefs.current[tab.id] = el;
      }}
    >
      <PanelTabItemStyled selected={selectedTabId === tab.id} onClick={handleTabClick}>
        <Box display={'flex'} overflow={'hidden'} flexGrow={1} justifyContent={'center'} alignItems={'center'}>
          <Tooltip title={tab.name} placement={'bottom'} key={tab.id}>
            <Typography
              display={'inline-block'}
              component={'span'}
              overflow={'hidden'}
              textOverflow={'ellipsis'}
              maxWidth={'100px'}
              variant='subtitle2'
            >
              {tab.name}
            </Typography>
          </Tooltip>
        </Box>
        <CustomIcon type='close' size='s' onClick={handleCloseClick} />
      </PanelTabItemStyled>
      <ContextMenu menu={menu} contextMenu={contextMenuPosition} onClose={handleCloseContextMenu} />
    </Box>
  );
});

PanelTabItem.displayName = 'PanelTabItem';

export default PanelTabItem;
