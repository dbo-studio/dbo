import { variables } from '@/src/core/theme/variables';
import { Box, styled } from '@mui/material';
import { SavedQueryItemStyledProps } from '../types';

export const SavedQueryItemStyled = styled(Box)<SavedQueryItemStyledProps>(({ theme, selected }) => ({
  padding: `${theme.spacing(1)} ${theme.spacing(1)}`,
  cursor: 'pointer',
  borderBottom: `1px solid ${theme.palette.divider}`,
  border: `1px solid ${selected ? theme.palette.divider : 'transparent'}`,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderRadius: variables.radius.medium,
  background: selected ? theme.palette.background.paper : theme.palette.background.default
}));
