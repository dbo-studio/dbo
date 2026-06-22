import { Box, CircularProgress, Fade } from '@mui/material';
import type { JSX } from 'react';
import { SplashScreenContentStyled, SplashScreenWrapperStyled } from './SplashScreen.styled';

export default function SplashScreen(): JSX.Element {
  return (
    <SplashScreenWrapperStyled>
      <Fade in={true} timeout={1000}>
        <SplashScreenContentStyled>
          <Box>
            <img src='/app-icon/icon-512.png' alt='logo' height={120} width={120} />
          </Box>
          <CircularProgress />
        </SplashScreenContentStyled>
      </Fade>
    </SplashScreenWrapperStyled>
  );
}
