import { useUUID } from '@/src/hooks';
import { useTabStore } from '@/src/store/tabStore/tab.store';
import { TabMode } from '@/src/types';
import { Box, Tab, Tabs } from '@mui/material';
import { useEffect, useState } from 'react';
import CustomIcon from '../../base/CustomIcon/CustomIcon';
import { StatusBarTabTypes } from './types';

const tabs: StatusBarTabTypes[] = [
  {
    id: 0,
    name: 'Data',
    icon: 'grid',
    iconActive: 'gridBlue',
    content: 'test content grid data'
  },
  {
    id: 1,
    name: 'Structure',
    icon: 'structure',
    iconActive: 'structureBlue',
    content: 'test content Structure'
  }
];

export default function StatusBarTabs() {
  const [selectedTabId, setSelectedTabId] = useState(TabMode.Data);
  const uuids = useUUID(2);
  const { selectedTab, updateSelectedTab } = useTabStore();

  const onSelectedTabChanged = (event: React.SyntheticEvent, id: number) => {
    if (!selectedTab) {
      return;
    }

    setSelectedTabId(id);
    updateSelectedTab({
      ...selectedTab,
      mode: id == TabMode.Data ? TabMode.Data : TabMode.Structure
    });
  };

  useEffect(() => {
    if (!selectedTab) {
      return;
    }

    setSelectedTabId(selectedTab.mode);
  }, [selectedTab]);

  return (
    <Box mb={'5px'}>
      <Tabs value={selectedTabId} onChange={onSelectedTabChanged}>
        {tabs.map((tabItem, index) => (
          <Tab
            iconPosition='start'
            icon={<CustomIcon type={selectedTabId == tabItem.id ? tabItem.iconActive : tabItem.icon} />}
            label={tabItem.name}
            key={uuids[index]}
          />
        ))}
      </Tabs>
    </Box>
  );
}
