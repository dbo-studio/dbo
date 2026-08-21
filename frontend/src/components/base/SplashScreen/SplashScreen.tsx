import locales from '@/locales';
import { Box, Button, CircularProgress, Fade, Typography } from '@mui/material';
import { type JSX, useEffect } from 'react';
import { SplashScreenContentStyled, SplashScreenWrapperStyled } from './SplashScreen.styled';

const LOGO_SRC = '/app-icon/icon-512.png';

const dismissBootSplash = (): void => {
  const bootSplash = document.getElementById('boot-splash');
  if (!bootSplash) {
    return;
  }
  bootSplash.classList.add('is-hidden');
  window.setTimeout(() => bootSplash.remove(), 250);
};

export type SplashScreenProps = {
  message?: string;
  errorMessage?: string | null;
  onRetry?: () => void;
};

export default function SplashScreen({ message, errorMessage, onRetry }: SplashScreenProps): JSX.Element {
  const hasError = Boolean(errorMessage);

  useEffect(() => {
    dismissBootSplash();
  }, []);

  return (
    <SplashScreenWrapperStyled>
      <Fade in={true} timeout={600}>
        <SplashScreenContentStyled>
          <Box
            component='img'
            src={LOGO_SRC}
            alt='DBO'
            sx={{
              width: 120,
              height: 120,
              display: 'block',
              userSelect: 'none',
              pointerEvents: 'none'
            }}
          />
          {hasError ? (
            <>
              <Typography color='error' variant='subtitle1' sx={{ maxWidth: 420, px: 2, textAlign: 'center' }}>
                {errorMessage}
              </Typography>
              {onRetry && (
                <Button variant='contained' onClick={onRetry}>
                  {locales.retry}
                </Button>
              )}
            </>
          ) : (
            <>
              <CircularProgress size={28} thickness={4} />
              {message ? (
                <Typography color='text.secondary' variant='body2'>
                  {message}
                </Typography>
              ) : null}
            </>
          )}
        </SplashScreenContentStyled>
      </Fade>
    </SplashScreenWrapperStyled>
  );
}
