import { Box, CircularProgress, Fade } from '@mui/material';
import type { JSX } from 'react';

export default function SplashScreen(): JSX.Element {
  return (
    <Box
      display='flex'
      flexDirection='column'
      justifyContent='center'
      alignItems='center'
      width='100vw'
      height='100vh'
      sx={{
        backgroundColor: (theme) => theme.palette.background.default
      }}
    >
      <Fade in={true} timeout={1000}>
        <Box
          display='flex'
          flexDirection='column'
          justifyContent='center'
          alignItems='center'
          gap={4}
        >
          <Box>
            <img src='/app-icon/icon-512.png' alt='logo' height={120} width={120} />
          </Box>
          <CircularProgress />
        </Box>
      </Fade>
    </Box>
  );
}

