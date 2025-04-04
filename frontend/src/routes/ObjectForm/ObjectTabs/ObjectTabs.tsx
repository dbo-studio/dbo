import type { ObjectTabType } from '@/api/tree/types';
import { Tab, Tabs } from '@mui/material';
import type { JSX } from 'react';
import type { ObjectTabProps } from '../types';
import { ObjectTabsStyled } from './ObjectTabs.styles';

export default function ObjectTabs({ tabs, selectedTabIndex, setSelectedTabIndex }: ObjectTabProps): JSX.Element {
  return (
    <ObjectTabsStyled>
      <Tabs value={selectedTabIndex} onChange={(_, newValue): void => setSelectedTabIndex(newValue)}>
        {tabs.map((tab: ObjectTabType) => (
          <Tab key={tab.id} label={tab.name} />
        ))}
      </Tabs>
    </ObjectTabsStyled>
  );
}
