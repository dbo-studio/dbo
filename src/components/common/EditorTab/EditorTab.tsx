import { Tab as TabData } from '@/src/store/types';
import { useAppStore } from '@/src/store/zustand';
import { faker } from '@faker-js/faker';
import { Tab, Tabs } from '@mui/material';
import dynamic from 'next/dynamic';
import CustomIcon from '../../base/CustomIcon/CustomIcon';

const maxTabs = 5;

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
          >
            {tabs.map((tab: TabData, index: number) => (
              <Tab
                value={tab.id}
                className='Mui-flat'
                sx={{ flex: 1 }}
                label={
                  <div>
                    <CustomIcon type='close' size='xs' onClick={() => removeTab(tab.id)} />
                    {tab.table}
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
