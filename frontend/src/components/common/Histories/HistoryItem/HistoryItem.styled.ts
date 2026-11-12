import { variables } from '@/core/theme/variables';
import { alpha, Box, styled } from '@mui/material';
import type { HistoryItemStyledProps } from '../types';

export const HistoryItemStyled = styled(Box)<HistoryItemStyledProps>(({ theme, selected }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  padding: theme.spacing(0.5, 1),
  minHeight: 32,
  cursor: 'pointer',
  borderRadius: variables.radius.medium,
  background: selected ? alpha(theme.palette.primary.main, 0.12) : 'transparent',
  '&:hover': {
    background: selected ? alpha(theme.palette.primary.main, 0.16) : alpha(theme.palette.action.active, 0.08)
  },
  '& .history-actions': { opacity: 0, transition: 'opacity 120ms' },
  '&:hover .history-actions, &:focus-within .history-actions': { opacity: 1 },
  [theme.breakpoints.down('sm')]: { minHeight: 44, '& .history-actions': { opacity: 1 } }
}));
