import { Stack, styled } from '@mui/material';
import type { StatusBarStylesProps } from './types';

export const StatusBarStyled = styled(Stack)<StatusBarStylesProps>(({ theme }) => ({
  background: theme.palette.background.default,
  width: '100%',
  borderTop: `1px solid ${theme.palette.divider}`,
  padding: '4px 8px',
}));