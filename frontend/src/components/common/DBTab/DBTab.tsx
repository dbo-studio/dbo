import ContextMenu from '@/components/base/ContextMenu/ContextMenu.tsx';
import { MenuType } from '@/components/base/ContextMenu/types.ts';
import { useContextMenu, useMount } from '@/hooks';
import { useRemoveTab } from '@/hooks/useRemoveTab.hook';
import locales from '@/locales';
import { useTabStore } from '@/store/tabStore/tab.store';
import { TabType as TabData } from '@/types';
import { Box, Tab, Tabs, Tooltip, Typography } from '@mui/material';
import CustomIcon from '../../base/CustomIcon/CustomIcon';
import TabPanel from './TabPanel/TabPanel';

export default function DBTab() {
  const { switchTab, tabs, selectedTab } = useTabStore();
  const [removeTab] = useRemoveTab();
  const mounted = useMount();
  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();

  const menu: MenuType[] = [
    {
      name: locales.close,
      action: () => {
        if (selectedTab) {
          removeTab(selectedTab.id);
        }
      },
      closeAfterAction: true
    },
    {
      name: locales.close_other_tabs,
      action: () => {
        tabs.forEach((tab) => {
          if (tab.id != selectedTab?.id) removeTab(tab.id);
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

  return (
    <>
      {selectedTab && mounted ? (
        <>
          <Tabs
            value={selectedTab.id}
            onChange={(_: React.SyntheticEvent, tabId: string) => switchTab(tabId)}
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
          <TabPanel />
        </>
      ) : null}
    </>
  );
}
