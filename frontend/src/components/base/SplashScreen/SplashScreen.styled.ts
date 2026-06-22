import { Box, styled } from '@mui/material';

export const SplashScreenWrapperStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  width: '100vw',
  height: '100vh',
  background: theme.palette.background.default
}));

export const SplashScreenContentStyled = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  gap: 4
});
