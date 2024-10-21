import { variables } from '@/core/theme/variables';
import { Box, styled } from '@mui/material';
import type { SavedQueryItemStyledProps } from '../types';

export const SavedQueryItemStyled = styled(Box)<SavedQueryItemStyledProps>(({ theme, selected }) => ({
  padding: `${theme.spacing(1 / 2)} ${theme.spacing(1)}`,
  cursor: 'pointer',
  borderBottom: `1px solid ${theme.palette.divider}`,
  border: `1px solid ${selected ? theme.palette.divider : 'transparent'}`,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderRadius: variables.radius.medium,
  background: theme.palette.background.default,
  color: selected ? theme.palette.text.primary : theme.palette.text.text
})) as typeof Box;
