import { TabMode } from '@/core/enums';
import { useUUID } from '@/hooks';
import locales from '@/locales';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Box, Tab, Tabs } from '@mui/material';
import { useEffect, useState } from 'react';
import CustomIcon from '../../base/CustomIcon/CustomIcon';
import type { StatusBarTabTypes } from './types';
import useNavigate from '@/hooks/useNavigate.hook';
import type { BaseProp } from '@/types';

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

export default function StatusBarTabs({ tab }: BaseProp) {
  const navigate = useNavigate();
  const [selectedTabId, setSelectedTabId] = useState(TabMode.Data);
  const uuids = useUUID(2);
  const { updateSelectedTab } = useTabStore();

  const onSelectedTabChanged = (event: React.SyntheticEvent, id: number) => {
    const findTab = tabs.find((tab) => tab.id === id);
    if (!findTab || !tab) return;
    navigate({
      route: findTab.link as 'design' | 'data',
      tabId: tab?.id
    });
    setSelectedTabId(id);
    updateSelectedTab({
      ...tab,
      mode: findTab.id
    });
  };

  useEffect(() => {
    if (!tab) {
      return;
    }

    setSelectedTabId(tab.mode);
  }, [tab]);

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
