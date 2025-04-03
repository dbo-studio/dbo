import { useSelectedTab } from '@/hooks/useSelectedTab.tsx';
import { StatusBarStyled } from './StatusBar.styled';
import StatusBarActions from './StatusBarActions/StatusBarActions.tsx';
import StatusBarPagination from './StatusBarPagination/StatusBarPagination';
import type { JSX } from 'react';

export default function StatusBar(): JSX.Element {
  const selectedTab = useSelectedTab();

  return (
    <StatusBarStyled mode={selectedTab?.mode} direction={'row'} justifyContent={'space-between'}>
      <StatusBarActions />
      <StatusBarPagination />
    </StatusBarStyled>
  );
}
