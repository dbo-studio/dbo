import ContextMenu from '@/components/base/ContextMenu/ContextMenu.tsx';
import type { MenuType } from '@/components/base/ContextMenu/types.ts';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { TabMode } from '@/core/enums';
import { shortcuts } from '@/core/utils';
import { useContextMenu, useShortcut } from '@/hooks';
import useNavigate from '@/hooks/useNavigate.hook';
import { useRemoveTab } from '@/hooks/useRemoveTab.hook';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { TabType as TabData, TabType } from '@/types';
import { Box, Tab, Tabs, Tooltip, Typography } from '@mui/material';
import type React from 'react';
import { useEffect, useState } from 'react';
import PanelItem from './PanelItem/PanelItem';

export default function Panels() {
  const navigate = useNavigate();
  const [removeTab] = useRemoveTab();
  const { addTab, getSelectedTab, getTabs } = useTabStore();
  const { runQuery, runRawQuery } = useDataStore();
  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();
  const [currentTabId, setCurrentTabId] = useState<undefined | string>();

  useShortcut(shortcuts.newTab, () => addNewEmptyTab());
  useShortcut(shortcuts.closeTab, () => getSelectedTab() && handleRemoveTab(getSelectedTab()?.id ?? ''));
  useShortcut(shortcuts.reloadTab, () => getSelectedTab() && handleReload());

  const menu: MenuType[] = [
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

  useEffect(() => {
    if (getSelectedTab()) {
      setCurrentTabId(getSelectedTab()?.id);
    }
  }, [getSelectedTab(), getSelectedTab]);

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
      runRawQuery();
      return;
    }

    if (getSelectedTab()?.mode === TabMode.Data || getSelectedTab()?.mode === TabMode.Design) {
      runQuery();
      return;
    }
  };

  return (
    currentTabId && (
      <>
        <Tabs
          value={currentTabId}
          onChange={(_: React.SyntheticEvent, tabId: string) => handleSwitchTab(tabId)}
          variant='scrollable'
          scrollButtons={false}
        >
          {getTabs()?.map((tab: TabData) => (
            <Tab
              onContextMenu={handleContextMenu}
              key={tab.id}
              value={tab.id}
              className='Mui-flat grid-tab'
              label={
                <Box display={'flex'} alignItems={'center'}>
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
                  <CustomIcon
                    type='close'
                    size='s'
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveTab(tab.id);
                    }}
                  />
                </Box>
              }
            />
          ))}
          <ContextMenu menu={menu} contextMenu={contextMenuPosition} onClose={handleCloseContextMenu} />
        </Tabs>
        <PanelItem />
      </>
    )
  );
}
