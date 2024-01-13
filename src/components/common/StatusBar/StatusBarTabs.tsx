import { useUUID } from '@/src/hooks';
import { Box, Tab, Tabs } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import CustomIcon from '../../base/CustomIcon/CustomIcon';
import { StatusBarTabProps, StatusBarTabTypes } from './types';

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

export default function StatusBarTabs({ onTabChange }: StatusBarTabProps) {
  const [selectedTabId, setSelectedTabId] = useState(0);
  const uuids = useUUID(2);

  const selectedTabContent = useMemo(() => {
    return tabs.find((obj) => obj.id === Number(selectedTabId))?.content;
  }, [selectedTabId]);

  const onSelectedTabChanged = (event: React.SyntheticEvent, id: number) => {
    setSelectedTabId(id);
    onTabChange(selectedTabContent);
  };

  useEffect(() => {
    onTabChange(selectedTabContent);
  });

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
