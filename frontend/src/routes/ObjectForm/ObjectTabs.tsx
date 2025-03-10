import type { ObjectTabType } from '@/api/tree/types';
import { Tab, Tabs } from '@mui/material';
import { ObjectTabsStyled } from './ObjectTabs.styles';
import type { ObjectTabProps } from './types';

export default function ObjectTabs({ tabs, selectedTabIndex, setSelectedTabIndex }: ObjectTabProps) {
  return (
    <ObjectTabsStyled>
      <Tabs value={selectedTabIndex} onChange={(_, newValue) => setSelectedTabIndex(newValue)}>
        {tabs.map((tab: ObjectTabType) => (
          <Tab key={tab.id} label={tab.name} />
        ))}
      </Tabs>
    </ObjectTabsStyled>
  );
}
