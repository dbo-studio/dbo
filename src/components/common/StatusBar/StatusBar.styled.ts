import { Box, styled } from '@mui/material';
import { StatusBarStylesProps } from './types';

export const StatusBarStyled = styled(Box)<StatusBarStylesProps>(({ theme }) => ({
  background: theme.palette.background.default,
  width: '100%',
  display: 'flex',
  justifyContent: 'space-between',
  borderTop: `1px solid ${theme.palette.divider}`,
  alignItems: 'center',
  padding: '4px 8px 0 8px'
}));
