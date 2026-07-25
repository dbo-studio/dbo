import type { ObjectTabType } from '@/types/Tree';
import { Tab, Tabs } from '@mui/material';
import type { JSX } from 'react';
import type { FormTabProps } from '../../types';
import { FormTabsStyled } from './FormTabs.styled';

export default function FormTabs({ tabs, selectedTabId, onTabChange }: FormTabProps): JSX.Element {
  return (
    <FormTabsStyled>
      <Tabs
        value={selectedTabId ?? tabs[0]?.id ?? ''}
        onChange={(_, newValue): void => onTabChange(newValue as string)}
      >
        {tabs.map((tab: ObjectTabType) => (
          <Tab value={tab.id} key={tab.id} label={tab.name} data-testid={`object-form-tab-${tab.id}`} />
        ))}
      </Tabs>
    </FormTabsStyled>
  );
}
