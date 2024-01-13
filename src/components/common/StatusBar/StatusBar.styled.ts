import { styled } from '@mui/material';

export const StatusBarStyled = styled('div')(({ theme }) => ({
  background: theme.palette.background.default,
  height: '60px',
  width: '100%',
  display: 'flex',
  justifyContent: 'space-between',
  borderTop: `1px solid ${theme.palette.divider}`,
  alignItems: 'center',
  padding: '0 8px',
  marginBottom: '4em'
}));
