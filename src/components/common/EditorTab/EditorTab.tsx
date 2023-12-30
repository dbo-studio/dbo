import { useAppStore } from '@/src/store/zustand';
import { TabType as TabData } from '@/src/types';
import { faker } from '@faker-js/faker';
import { Tab, Tabs, Typography } from '@mui/material';
import dynamic from 'next/dynamic';
import CustomIcon from '../../base/CustomIcon/CustomIcon';

const DynamicTabPanel = dynamic(() => import('./TabPanel'), {
  loading: () => null
});

export default function EditorTab() {
  const { addTab, removeTab, switchTab, tabs, selectedTab } = useAppStore();

  return (
    <>
      {selectedTab ? (
        <>
          <Tabs
            value={selectedTab.id}
            onChange={(_: React.SyntheticEvent, tabId: string) => switchTab(tabId)}
            variant='scrollable'
            scrollButtons={false}
            allowScrollButtonsMobile
          >
            {tabs.map((tab: TabData, index: number) => (
              <Tab
                value={tab.id}
                className='Mui-flat grid-tab'
                label={
                  <div>
                    <CustomIcon type='close' size='xs' onClick={() => removeTab(tab.id)} />
                    <Typography
                      mt={'3px'}
                      display={'inline-block'}
                      component={'span'}
                      overflow={'hidden'}
                      textOverflow={'ellipsis'}
                      maxWidth={'100px'}
                      variant='subtitle2'
                    >
                      {tab.table}
                    </Typography>
                    {/* {tab.table} */}
                  </div>
                }
                key={index}
              />
            ))}
          </Tabs>
          <DynamicTabPanel />
        </>
      ) : null}
      <div>
        <button
          style={{ position: 'absolute', right: 0, bottom: 0, zIndex: 9999 }}
          onClick={() => addTab(faker.database.collation())}
        >
          Add Tab
        </button>
      </div>
    </>
  );
}
