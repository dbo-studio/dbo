import { Box, TableRow, styled } from '@mui/material';
import { ColumnItemStyledProps } from './types';

export const ColumnsStyled = styled(Box)(() => ({
  display: 'flex',
  flex: 1,
  overflow: 'auto'
}));

export const ColumnItemStyled = styled(TableRow)<ColumnItemStyledProps>(
  ({ theme, selected, edited, deleted, unsaved }) => ({
    '&:last-child td, &:last-child th': { border: 0 },
    cursor: 'pointer',
    background: selected
      ? theme.palette.action.selected + ' !important'
      : edited
        ? '#fff8da' + ' !important'
        : deleted
          ? '#ffebeb' + ' !important'
          : unsaved
            ? '#DFE3E8' + ' !important'
            : 'unset'
  })
);
