import { useLayoutMode } from '@/hooks/useLayoutMode.hook';
import { StatusBarStyled } from '@/routes/Data/StatusBar/StatusBar.styled';
import StatusBarActions from '@/routes/Data/StatusBar/StatusBarActions/StatusBarActions';
import StatusBarPagination from '@/routes/Data/StatusBar/StatusBarPagination/StatusBarPagination';
import { Stack } from '@mui/material';
import type { JSX } from 'react';
import type { DataGridStatusBarProps } from './types';

export default function DataGridStatusBar({ showPagination = false }: DataGridStatusBarProps): JSX.Element {
  const { isMobile } = useLayoutMode();

  return (
    <StatusBarStyled direction='row' mobile={isMobile}>
      <Stack direction='row' sx={{ alignItems: 'center', minWidth: 0, flex: 1 }}>
        <StatusBarActions />
      </Stack>
      {showPagination && <StatusBarPagination />}
    </StatusBarStyled>
  );
}
