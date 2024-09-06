import ContextMenu from '@/components/base/ContextMenu/ContextMenu.tsx';
import type { MenuType } from '@/components/base/ContextMenu/types.ts';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { useContextMenu, useCurrentTab, useMount } from '@/hooks';
import { useRemoveTab } from '@/hooks/useRemoveTab.hook';
import locales from '@/locales';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { TabType as TabData } from '@/types';
import { Box, Tab, Tabs, Tooltip, Typography } from '@mui/material';
import PanelItem from './PanelItem/PanelItem';
import useNavigate, { type NavigationParamsType } from '@/hooks/useNavigate.hook';

export default function Panels() {
  const navigate = useNavigate();
  const mounted = useMount();
  const currentTab = useCurrentTab();
  const { tabs } = useTabStore();
  const [removeTab] = useRemoveTab();
  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();

  const menu: MenuType[] = [
    {
      name: locales.close_other_tabs,
      action: () => {
        for (const tab of tabs) {
          if (tab.id !== currentTab?.id) removeTab(tab.id);
          else navigate({ route: 'data', tabId: tab.id });
        }
      },
      closeAfterAction: true
    },
    {
      name: locales.close_all,
      action: () => {
        for (const tab of tabs) {
          removeTab(tab.id);
        }
        navigate({ route: '/' });
      },
      closeAfterAction: true
    }
  ];

  const handleSwitchTab = (tabId: string) => {
    const tab = tabs.find((tab) => tab.id === tabId);
    if (!tab) return;

    navigate({
      route: 'data',
      tabId: tabId
    });
  };

  const handleRemoveTab = (tabId: string) => {
    const newTabId = removeTab(tabId);
    if (newTabId === undefined) {
      navigate({ route: '/' });
      return;
    }

    const newRoute: NavigationParamsType = { route: '/' };
    if (newTabId) {
      newRoute.route = 'data';
      newRoute.tabId = newTabId;
      navigate(newRoute);
    }
  };

  return (
    <>
      {(currentTab || tabs.length > 0) && mounted ? (
        <>
          <Tabs
            value={currentTab?.id ?? tabs[0]}
            onChange={(_: React.SyntheticEvent, tabId: string) => handleSwitchTab(tabId)}
            variant='scrollable'
            scrollButtons={false}
          >
            {tabs.map((tab: TabData) => (
              <Tab
                onContextMenu={handleContextMenu}
                key={tab.id}
                value={tab.id}
                className='Mui-flat grid-tab'
                label={
                  <Tooltip title={tab.table}>
                    <Box display={'flex'} alignItems={'center'}>
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
                      <CustomIcon type='close' size='s' onClick={() => handleRemoveTab(tab.id)} />
                    </Box>
                  </Tooltip>
                }
              />
            ))}
            <ContextMenu menu={menu} contextMenu={contextMenuPosition} onClose={handleCloseContextMenu} />
          </Tabs>
          <PanelItem />
        </>
      ) : null}
    </>
  );
}
