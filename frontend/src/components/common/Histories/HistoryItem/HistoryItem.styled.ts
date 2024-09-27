import { variables } from '@/core/theme/variables';
import { Box, styled } from '@mui/material';
import type { HistoryItemStyledProps } from '../types';

export const HistoryItemStyled = styled(Box)<HistoryItemStyledProps>(({ theme, selected }) => ({
  padding: `0 ${theme.spacing(1)}`,
  cursor: 'pointer',
  borderBottom: `1px solid ${theme.palette.divider}`,
  border: `1px solid ${selected ? theme.palette.divider : 'transparent'}`,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderRadius: variables.radius.medium,
  background: selected ? theme.palette.background.paper : theme.palette.background.default,
  marginBottom: theme.spacing(1)
}));
