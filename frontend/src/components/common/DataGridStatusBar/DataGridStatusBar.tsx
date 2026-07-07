import { useLayoutMode } from '@/hooks/useLayoutMode.hook';
import StatusBarActions from '@/routes/Data/StatusBar/StatusBarActions/StatusBarActions';
import StatusBarPagination from '@/routes/Data/StatusBar/StatusBarPagination/StatusBarPagination';
import { StatusBarStyled } from '@/routes/Data/StatusBar/StatusBar.styled';
import type { JSX } from 'react';

type DataGridStatusBarProps = {
  showPagination?: boolean;
};

export default function DataGridStatusBar({ showPagination = false }: DataGridStatusBarProps): JSX.Element {
  const { isMobile } = useLayoutMode();

  return (
    <StatusBarStyled direction='row' mobile={isMobile}>
      <StatusBarActions />
      {showPagination && <StatusBarPagination />}
    </StatusBarStyled>
  );
}
