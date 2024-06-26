import { useTabStore } from '@/store/tabStore/tab.store';
import { lazy } from 'react';
import { StatusBarStyled } from './StatusBar.styled';

const StatusBarActions = lazy(() => import('./StatusBarActions'));
const StatusBarTabs = lazy(() => import('./StatusBarTabs'));
const StatusBarPagination = lazy(() => import('./StatusBarPagination'));

export default function StatusBar() {
  const { selectedTab } = useTabStore();

  return (
    <StatusBarStyled mode={selectedTab?.mode} direction={'row'} justifyContent={'space-between'}>
      <StatusBarActions />
      <StatusBarTabs />
      <StatusBarPagination mode={selectedTab?.mode} />
    </StatusBarStyled>
  );
}
