import { useCurrentTab } from '@/hooks';
import { Suspense, lazy } from 'react';
import { StatusBarStyled } from './StatusBar.styled';

const StatusBarActions = lazy(() => import('./StatusBarActions'));
const StatusBarTabs = lazy(() => import('./StatusBarTabs'));
const StatusBarPagination = lazy(() => import('./StatusBarPagination'));

export default function StatusBar() {
  const currentTab = useCurrentTab();
  return (
    <StatusBarStyled mode={currentTab?.mode} direction={'row'} justifyContent={'space-between'}>
      <Suspense>
        <StatusBarActions />
      </Suspense>
      <Suspense>
        <StatusBarTabs />
      </Suspense>
      <Suspense>
        <StatusBarPagination mode={currentTab?.mode} />
      </Suspense>
    </StatusBarStyled>
  );
}
