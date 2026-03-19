import { styled } from '@mui/material';
import { Box } from '@mui/system';

export const SplashScreenWrapperStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  width: '100vw',
  height: '100vh',
  background: theme.palette.background.default
}));
