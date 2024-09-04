import { TabMode } from '@/core/enums';
import { useCurrentConnection, useCurrentTab, useUUID } from '@/hooks';
import locales from '@/locales';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Box, Tab, Tabs } from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomIcon from '../../base/CustomIcon/CustomIcon';
import type { StatusBarTabTypes } from './types';

const tabs: StatusBarTabTypes[] = [
  {
    id: TabMode.Data,
    name: locales.data,
    icon: 'grid',
    iconActive: 'gridBlue',
    link: 'data'
  },
  {
    id: TabMode.Design,
    name: locales.design,
    icon: 'structure',
    iconActive: 'structureBlue',
    link: 'design'
  }
];

export default function StatusBarTabs() {
  const navigate = useNavigate();
  const currentTab = useCurrentTab();
  const currentConnection = useCurrentConnection();
  const [selectedTabId, setSelectedTabId] = useState(TabMode.Data);
  const uuids = useUUID(2);
  const { updateSelectedTab } = useTabStore();

  const onSelectedTabChanged = (event: React.SyntheticEvent, id: number) => {
    const tab = tabs.find((tab) => tab.id === id);
    if (!tab || !currentTab) return;

    navigate(`/${tab.link}/${currentTab?.id}/${currentConnection?.id}`);
    setSelectedTabId(id);
    updateSelectedTab({
      ...currentTab,
      mode: tab.id
    });
  };

  useEffect(() => {
    if (!currentTab) {
      return;
    }

    setSelectedTabId(currentTab.mode);
  }, [currentTab]);

  return (
    <Box mb={'5px'}>
      <Tabs value={selectedTabId} onChange={onSelectedTabChanged}>
        {tabs.map((tabItem, index) => (
          <Tab
            iconPosition='start'
            icon={<CustomIcon type={selectedTabId === tabItem.id ? tabItem.iconActive : tabItem.icon} />}
            label={tabItem.name}
            key={uuids[index]}
          />
        ))}
      </Tabs>
    </Box>
  );
}
