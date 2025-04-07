import locales from '@/locales';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Box, Button, Typography, useTheme } from '@mui/material';
import type { JSX } from 'react';
import { useNavigate } from 'react-router-dom';

export default function NotFound(): JSX.Element {
  const theme = useTheme();
  const { updateSelectedTab } = useTabStore();
  const navigate = useNavigate();

  const goHome = (): void => {
    updateSelectedTab(undefined);
    navigate('/');
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        textAlign: 'center',
        backgroundColor: theme.palette.background.default
      }}
    >
      <Typography variant='h1' component='div' gutterBottom>
        404
      </Typography>
      <Typography variant='h5' component='div' gutterBottom>
        {locales['404_description']}
      </Typography>

      <Button variant='contained' color='primary' onClick={goHome}>
        {locales.back_to_home}
      </Button>
    </Box>
  );
}
