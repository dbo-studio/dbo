import ContextMenu from '@/components/base/ContextMenu/ContextMenu.tsx';
import type { MenuType } from '@/components/base/ContextMenu/types.ts';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon.tsx';
import { PanelTabItemStyled } from '@/components/common/Panels/PanelTabs/PanelTabItem/PanelTabItem.styled.ts';
import { TabMode } from '@/core/enums';
import { shortcuts } from '@/core/utils';
import { useContextMenu, useShortcut } from '@/hooks';
import { useRemoveTab } from '@/hooks/useRemoveTab.hook.ts';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store.ts';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import type { TabType } from '@/types';
import { Box, Tooltip, Typography } from '@mui/material';
import type { JSX } from 'react';
import { useEffect, useRef } from 'react';

export default function PanelTabItem({ tab }: { tab: TabType }): JSX.Element {
  const selectedTab = useSelectedTab();

  const tabRefs = useRef<Record<string, HTMLElement>>({});
  const [removeTab] = useRemoveTab();
  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();
  const { addEditorTab, getTabs } = useTabStore();
  const { runQuery, runRawQuery, removeEditedRowsByTabId, deleteRemovedRowsByTabId, removeUnsavedRowsByTabId } =
    useDataStore();
  const { updateSelectedTab } = useTabStore();

  useShortcut(shortcuts.newTab, () => addNewEmptyTab());
  useShortcut(shortcuts.closeTab, () => handleRemoveTab(selectedTab?.id ?? ''));
  useShortcut(shortcuts.reloadTab, () => handleReload());

  const menu: MenuType[] = [
    {
      name: locales.close,
      action: (): void => {
        if (!tab) return;
        removeTab(tab, tab.id);
      },
      closeAfterAction: true
    },
    {
      name: locales.close_other_tabs,
      action: (): void => {
        for (const t of getTabs()) {
          if (t.id !== selectedTab?.id) removeTab(t, t.id);
        }
      },
      closeAfterAction: true
    },
    {
      name: locales.close_all,
      action: (): void => {
        for (const t of getTabs()) {
          removeTab(t, t.id);
        }
        updateSelectedTab(undefined);
      },
      closeAfterAction: true
    }
  ];

  const handleSwitchTab = (tabId: string): void => {
    const findTab = getTabs().find((t: TabType) => t.id === tabId);
    if (!findTab) return;

    updateSelectedTab(findTab);
  };

  const handleRemoveTab = (tabId: string): void => {
    if (!selectedTab) return;

    const newTab = removeTab(selectedTab, tabId);
    if (newTab === undefined) {
      updateSelectedTab(undefined);
      return;
    }

    if (newTab) {
      updateSelectedTab(newTab);
    }
  };

  const addNewEmptyTab = (): void => {
    const tab = addEditorTab();
    updateSelectedTab(tab);
  };

  const handleReload = async (): Promise<void> => {
    if (selectedTab?.mode === TabMode.Query) {
      await runRawQuery();
      return;
    }

    if (selectedTab?.mode === TabMode.Data) {
      await runQuery();
      removeEditedRowsByTabId(selectedTab?.id ?? '');
      deleteRemovedRowsByTabId(selectedTab?.id ?? '');
      removeUnsavedRowsByTabId(selectedTab?.id ?? '');
      return;
    }
  };

  useEffect(() => {
    const tabId = selectedTab?.id;
    if (tabId && tabRefs.current?.[tabId]) {
      tabRefs.current[tabId].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [selectedTab]);

  return (
    <Box
      onContextMenu={handleContextMenu}
      ref={(el: HTMLElement): void => {
        tabRefs.current[tab.id] = el;
      }}
    >
      <PanelTabItemStyled selected={selectedTab?.id === tab.id} onClick={(): void => handleSwitchTab(tab.id)}>
        <Box display={'flex'} overflow={'hidden'} flexGrow={1} justifyContent={'center'} alignItems={'center'}>
          <Tooltip title={tab.nodeId} placement={'bottom'} key={tab.id}>
            <Typography
              display={'inline-block'}
              component={'span'}
              overflow={'hidden'}
              textOverflow={'ellipsis'}
              maxWidth={'100px'}
              variant='subtitle2'
            >
              {tab.nodeId}
            </Typography>
          </Tooltip>
        </Box>
        <CustomIcon
          type='close'
          size='s'
          onClick={(e: React.MouseEvent<HTMLButtonElement>): void => {
            e.stopPropagation();
            handleRemoveTab(tab.id);
          }}
        />
      </PanelTabItemStyled>
      <ContextMenu menu={menu} contextMenu={contextMenuPosition} onClose={handleCloseContextMenu} />
    </Box>
  );
}
