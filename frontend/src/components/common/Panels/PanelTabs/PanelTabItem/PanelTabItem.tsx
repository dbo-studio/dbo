import ContextMenu from '@/components/base/ContextMenu/ContextMenu.tsx';
import type { MenuType } from '@/components/base/ContextMenu/types.ts';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon.tsx';
import { PanelTabItemStyled } from '@/components/common/Panels/PanelTabs/PanelTabItem/PanelTabItem.styled.ts';
import { TabMode } from '@/core/enums';
import { shortcuts } from '@/core/utils';
import { useContextMenu, useShortcut } from '@/hooks';
import useNavigate from '@/hooks/useNavigate.hook.ts';
import { useRemoveTab } from '@/hooks/useRemoveTab.hook.ts';
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
  const { addTab, getSelectedTab, getTabs } = useTabStore();
  const { runQuery, runRawQuery } = useDataStore();

  useShortcut(shortcuts.newTab, () => addNewEmptyTab());
  useShortcut(shortcuts.closeTab, () => getSelectedTab() && handleRemoveTab(getSelectedTab()?.id ?? ''));
  useShortcut(shortcuts.reloadTab, () => getSelectedTab() && handleReload());

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
          if (t.id !== getSelectedTab()?.id) removeTab(t.id);
          else navigate({ route: 'data', tabId: t.id });
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
    const tab = addTab('Editor', TabMode.Query);
    navigate({
      route: 'query',
      tabId: tab.id
    });
  };

  const handleReload = () => {
    if (getSelectedTab()?.mode === TabMode.Query) {
      runRawQuery().then();
      return;
    }

    if (getSelectedTab()?.mode === TabMode.Data || getSelectedTab()?.mode === TabMode.Design) {
      runQuery().then();
      return;
    }
  };

  useEffect(() => {
    const tabId = getSelectedTab()?.id;
    if (tabId && tabRefs.current?.[tabId]) {
      tabRefs.current[tabId].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [getSelectedTab()]);

  return (
    <Box
      onContextMenu={handleContextMenu}
      ref={(el: HTMLElement) => {
        tabRefs.current[tab.id] = el;
      }}
    >
      <PanelTabItemStyled selected={getSelectedTab()?.id === tab.id} onClick={() => handleSwitchTab(tab.id)}>
        <Box display={'flex'} overflow={'hidden'} flexGrow={1} justifyContent={'center'} alignItems={'center'}>
          <Tooltip title={tab.table} placement={'bottom'} key={tab.id}>
            <Typography
              display={'inline-block'}
              component={'span'}
              overflow={'hidden'}
              textOverflow={'ellipsis'}
              maxWidth={'100px'}
              variant='subtitle2'
            >
              {tab.table}
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
