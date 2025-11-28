import { Box, styled } from '@mui/material';

export const FormStatusBarStyled = styled(Box)(({ theme }) => ({
  background: theme.palette.background.default,
  width: '100%',
  borderTop: `1px solid ${theme.palette.divider}`,
  padding: '4px 8px',
  display: 'flex',
  alignItems: 'center'
}));
