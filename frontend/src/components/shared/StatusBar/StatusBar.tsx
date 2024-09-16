import { useTabStore } from '@/store/tabStore/tab.store';
import { Suspense, lazy } from 'react';
import { StatusBarStyled } from './StatusBar.styled';

const StatusBarActions = lazy(() => import('./StatusBarActions'));
const StatusBarTabs = lazy(() => import('./StatusBarTabs'));
const StatusBarPagination = lazy(() => import('./StatusBarPagination/StatusBarPagination'));

export default function StatusBar() {
  const { getSelectedTab } = useTabStore();

  return (
    <StatusBarStyled mode={getSelectedTab()?.mode} direction={'row'} justifyContent={'space-between'}>
      <Suspense>
        <StatusBarActions />
      </Suspense>
      <Suspense>
        <StatusBarTabs />
      </Suspense>
      <Suspense>
        <StatusBarPagination />
      </Suspense>
    </StatusBarStyled>
  );
}
