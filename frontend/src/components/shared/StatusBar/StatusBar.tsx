import { Suspense, lazy } from 'react';
import { StatusBarStyled } from './StatusBar.styled';
import type { BaseProp } from '@/types';

const StatusBarActions = lazy(() => import('./StatusBarActions'));
const StatusBarTabs = lazy(() => import('./StatusBarTabs'));
const StatusBarPagination = lazy(() => import('./StatusBarPagination/StatusBarPagination'));

export default function StatusBar({ tab, connection }: BaseProp) {
  return (
    <StatusBarStyled mode={tab?.mode} direction={'row'} justifyContent={'space-between'}>
      <Suspense>
        <StatusBarActions tab={tab} connection={connection} />
      </Suspense>
      <Suspense>
        <StatusBarTabs tab={tab} connection={connection} />
      </Suspense>
      <Suspense>
        <StatusBarPagination tab={tab} connection={connection} />
      </Suspense>
    </StatusBarStyled>
  );
}
