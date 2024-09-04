import ContextMenu from '@/components/base/ContextMenu/ContextMenu.tsx';
import { MenuType } from '@/components/base/ContextMenu/types.ts';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { useContextMenu, useCurrentConnection, useCurrentTab, useMount } from '@/hooks';
import { useRemoveTab } from '@/hooks/useRemoveTab.hook';
import locales from '@/locales';
import { useTabStore } from '@/store/tabStore/tab.store';
import { TabType as TabData } from '@/types';
import { Box, Tab, Tabs, Tooltip, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PanelItem from './PanelItem/PanelItem';

export default function Panels() {
  const navigate = useNavigate();
  const mounted = useMount();
  const currentTab = useCurrentTab();
  const currentConnection = useCurrentConnection();

  const { tabs } = useTabStore();
  const [removeTab] = useRemoveTab();
  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();

  const menu: MenuType[] = [
    {
      name: locales.close,
      action: () => {
        if (currentTab) {
          removeTab(currentTab.id);
        }
      },
      closeAfterAction: true
    },
    {
      name: locales.close_other_tabs,
      action: () => {
        tabs.forEach((tab) => {
          if (tab.id != currentTab?.id) removeTab(tab.id);
        });
      },
      closeAfterAction: true
    },
    {
      name: locales.close_all,
      action: () => {
        tabs.forEach((tab) => removeTab(tab.id));
      },
      closeAfterAction: true
    }
  ];

  const handleSwitchTab = (tabId: string) => {
    navigate(`/data/${tabId}/${currentConnection?.id}`);
  };

  return (
    <>
      {currentTab && mounted ? (
        <>
          <Tabs
            value={currentTab.id}
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
                      <CustomIcon type='close' size='s' onClick={() => removeTab(tab.id)} />
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
