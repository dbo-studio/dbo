import ContextMenu from '@/components/base/ContextMenu/ContextMenu.tsx';
import type { MenuType } from '@/components/base/ContextMenu/types.ts';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon.tsx';
import { PanelTabItemStyled } from '@/components/common/Panels/PanelTabs/PanelTabItem/PanelTabItem.styled.ts';
import { TabMode } from '@/core/enums';
import { shortcuts } from '@/core/utils';
import { useContextMenu, useShortcut } from '@/hooks';
import useNavigate from '@/hooks/useNavigate.hook.ts';
import { useRemoveTab } from '@/hooks/useRemoveTab.hook.ts';
import { useSelectedTab } from '@/hooks/useSelectedTab';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store.ts';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import type { TabType } from '@/types';
import { Box, Tooltip, Typography } from '@mui/material';
import { useEffect, useRef } from 'react';

export default function PanelTabItem({ tab }: { tab: TabType }) {
  const tabRefs = useRef<Record<string, HTMLElement>>({});
  const navigate = useNavigate();
  const [removeTab] = useRemoveTab();
  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();
  const { addTab, getTabs } = useTabStore();
  const selectedTab = useSelectedTab();
  const { runQuery, runRawQuery, removeEditedRowsByTabId, deleteRemovedRowsByTabId, removeUnsavedRowsByTabId } =
    useDataStore();

  useShortcut(shortcuts.newTab, () => addNewEmptyTab());
  useShortcut(shortcuts.closeTab, () => selectedTab && handleRemoveTab(selectedTab?.id ?? ''));
  useShortcut(shortcuts.reloadTab, () => selectedTab && handleReload());

  const menu: MenuType[] = [
    {
      name: locales.close,
      action: () => removeTab(tab.id),
      closeAfterAction: true
    },
    {
      name: locales.close_other_tabs,
      action: () => {
        for (const t of getTabs()) {
          if (t.id !== selectedTab?.id) removeTab(t.id);
        }
      },
      closeAfterAction: true
    },
    {
      name: locales.close_all,
      action: () => {
        for (const t of getTabs()) {
          removeTab(t.id);
        }
        navigate({ route: '/' });
      },
      closeAfterAction: true
    }
  ];

  const handleSwitchTab = (tabId: string) => {
    const findTab = getTabs().find((t: TabType) => t.id === tabId);
    if (!findTab) return;

    navigate({
      route: findTab.mode,
      tabId: tabId
    });
  };

  const handleRemoveTab = (tabId: string) => {
    const newTab = removeTab(tabId);
    if (newTab === undefined) {
      navigate({ route: '/' });
      return;
    }

    if (newTab) {
      navigate({
        route: newTab.mode,
        tabId: newTab.id
      });
    }
  };

  const addNewEmptyTab = () => {
    const tab = addTab('Editor', undefined, TabMode.Query);
    navigate({
      route: 'query',
      tabId: tab.id
    });
  };

  const handleReload = async () => {
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
      ref={(el: HTMLElement) => {
        tabRefs.current[tab.id] = el;
      }}
    >
      <PanelTabItemStyled selected={selectedTab?.id === tab.id} onClick={() => handleSwitchTab(tab.id)}>
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
          onClick={(e) => {
            e.stopPropagation();
            handleRemoveTab(tab.id);
          }}
        />
      </PanelTabItemStyled>
      <ContextMenu menu={menu} contextMenu={contextMenuPosition} onClose={handleCloseContextMenu} />
    </Box>
  );
}
