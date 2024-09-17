import { TabMode } from '@/core/enums';
import { useUUID } from '@/hooks';
import useNavigate from '@/hooks/useNavigate.hook';
import locales from '@/locales';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { TabType } from '@/types';
import { Box, Tab, Tabs } from '@mui/material';
import { useEffect, useState } from 'react';
import CustomIcon from '../../base/CustomIcon/CustomIcon';
import type { StatusBarTabTypes } from './types';

const tabs: StatusBarTabTypes[] = [
  {
    id: TabMode.Data,
    name: locales.data,
    icon: 'grid',
    iconActive: 'gridBlue',
    link: '/data'
  },
  {
    id: TabMode.Design,
    name: locales.design,
    icon: 'structure',
    iconActive: 'structureBlue',
    link: '/design'
  }
];

export default function StatusBarTabs() {
  const navigate = useNavigate();
  const [selectedTabId, setSelectedTabId] = useState(TabMode.Data);
  const uuids = useUUID(2);
  const { updateSelectedTab, getSelectedTab } = useTabStore();

  const onSelectedTabChanged = (event: React.SyntheticEvent, id: number) => {
    const findTab = tabs.find((tab) => tab.id === id);
    if (!findTab || !getSelectedTab()) return;
    setSelectedTabId(id);
    updateSelectedTab({
      ...(getSelectedTab() ?? ({} as TabType)),
      mode: findTab.id
    });
    navigate({
      route: findTab.link as 'design' | 'data',
      tabId: getSelectedTab()?.id
    });
  };

  useEffect(() => {
    if (!getSelectedTab()) {
      return;
    }

    setSelectedTabId(getSelectedTab()?.mode ?? TabMode.Data);
  }, [getSelectedTab()]);

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
