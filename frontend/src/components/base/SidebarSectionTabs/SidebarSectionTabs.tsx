import { Tab, Tabs } from '@mui/material';
import type { JSX } from 'react';
import type { SidebarSectionTabsProps } from './types';

export default function SidebarSectionTabs<T extends string | number>({
  value,
  onChange,
  tabs,
  'aria-label': ariaLabel
}: SidebarSectionTabsProps<T>): JSX.Element {
  return (
    <Tabs
      className='MuiTabs-flat'
      value={value}
      variant='fullWidth'
      aria-label={ariaLabel}
      sx={{ flexShrink: 0 }}
      onChange={(_event, next: T): void => onChange(next)}
    >
      {tabs.map((tab) => (
        <Tab key={String(tab.id)} className='Mui-flat' value={tab.id} label={tab.label} disableRipple />
      ))}
    </Tabs>
  );
}
