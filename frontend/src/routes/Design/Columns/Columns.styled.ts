import { Box, TableRow, styled } from '@mui/material';
import type { ColumnItemStyledProps } from './types';

export const ColumnsStyled = styled(Box)(() => ({
  display: 'flex',
  flex: 1,
  overflow: 'auto'
}));

export const ColumnItemStyled = styled(TableRow)<ColumnItemStyledProps>(
  ({ theme, selected, edited, deleted, unsaved }) => ({
    cursor: 'pointer',
    background: selected
      ? `${theme.palette.action.selected} !important`
      : edited
        ? `${theme.palette.background.warning} !important`
        : deleted
          ? `${theme.palette.background.danger} !important`
          : unsaved
            ? `${theme.palette.background.success} !important`
            : 'unset'
  })
);
