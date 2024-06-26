import { useMount } from '@/hooks';
import { useTabStore } from '@/store/tabStore/tab.store';
import { TabType as TabData } from '@/types';
import { Box, Tab, Tabs, Tooltip, Typography } from '@mui/material';
import CustomIcon from '../../base/CustomIcon/CustomIcon';
import TabPanel from './TabPanel/TabPanel';

export default function DBTab() {
  const { switchTab, removeTab, tabs, selectedTab } = useTabStore();
  const mounted = useMount();

  return (
    <>
      {selectedTab && mounted ? (
        <>
          <Tabs
            value={selectedTab.id}
            onChange={(_: React.SyntheticEvent, tabId: string) => switchTab(tabId)}
            variant='scrollable'
            allowScrollButtonsMobile
          >
            {tabs.map((tab: TabData) => (
              <Tab
                key={tab.id}
                value={tab.id}
                className='Mui-flat grid-tab'
                label={
                  <Tooltip title={tab.table}>
                    <Box display={'flex'} alignItems={'center'}>
                      <CustomIcon type='close' size='s' onClick={() => removeTab(tab.id)} />
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
                    </Box>
                  </Tooltip>
                }
              />
            ))}
          </Tabs>
          <TabPanel />
        </>
      ) : null}
    </>
  );
}
