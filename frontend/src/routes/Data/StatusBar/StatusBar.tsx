import { useLayoutMode } from '@/hooks/useLayoutMode.hook';
import type { JSX } from 'react';
import { StatusBarStyled } from './StatusBar.styled';
import StatusBarActions from './StatusBarActions/StatusBarActions.tsx';
import StatusBarPagination from './StatusBarPagination/StatusBarPagination';

export default function StatusBar(): JSX.Element {
  const { isMobile } = useLayoutMode();

  return (
    <StatusBarStyled direction='row' mobile={isMobile}>
      <StatusBarActions />
      <StatusBarPagination />
    </StatusBarStyled>
  );
}
