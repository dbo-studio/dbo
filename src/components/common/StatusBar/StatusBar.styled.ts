import { TabMode } from '@/src/types';
import { Box, styled } from '@mui/material';
import { StatusBarStylesProps } from './types';

export const StatusBarStyled = styled(Box)<StatusBarStylesProps>(({ theme, mode }) => ({
  background: theme.palette.background.default,
  height: mode == TabMode.Data ? '60px' : '47px',
  width: '100%',
  display: 'flex',
  justifyContent: 'space-between',
  borderTop: `1px solid ${theme.palette.divider}`,
  alignItems: 'center',
  padding: '0 8px',
  marginBottom: '4em'
}));
