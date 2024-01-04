import { useTabStore } from '@/src/store/tabStore/tab.store';
import { TabType as TabData } from '@/src/types';
import { Box, Tab, Tabs, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import CustomIcon from '../../base/CustomIcon/CustomIcon';
import TabPanel from './TabPanel';

export default function EditorTab() {
  const { removeTab, switchTab, tabs, selectedTab } = useTabStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <>
      {selectedTab && isMounted ? (
        <>
          <Tabs
            value={selectedTab.id}
            onChange={(_: React.SyntheticEvent, tabId: string) => switchTab(tabId)}
            variant='scrollable'
            allowScrollButtonsMobile
          >
            {tabs.map((tab: TabData, index: number) => (
              <Tab
                value={tab.id}
                className='Mui-flat grid-tab'
                label={
                  <Box display={'flex'} alignItems={'center'}>
                    <CustomIcon type='close' size='xs' onClick={() => removeTab(tab.id)} />
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
                }
                key={index}
              />
            ))}
          </Tabs>
          <TabPanel />
        </>
      ) : null}
    </>
  );
}
