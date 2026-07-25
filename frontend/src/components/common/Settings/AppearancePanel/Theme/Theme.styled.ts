import { Box, styled } from '@mui/material';

export const ThemeSelectorStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(4)
}));
