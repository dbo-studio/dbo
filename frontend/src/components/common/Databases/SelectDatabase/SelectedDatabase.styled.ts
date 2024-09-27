import { variables } from '@/core/theme/variables';
import { Box, styled } from '@mui/material';
import type { DatabaseItemStyledProps } from '../types';

export const DatabaseItemStyled = styled(Box)<DatabaseItemStyledProps>(({ theme, selected }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  cursor: 'pointer',
  padding: `${theme.spacing(1)} ${theme.spacing(2)}`,
  borderRadius: variables.radius.medium,
  background: selected ? theme.palette.background.paper : 'unset',
  marginBottom: theme.spacing(1),
  border: `1px solid ${theme.palette.divider}`,
  ':hover': {
    background: theme.palette.background.paper
  }
}));
