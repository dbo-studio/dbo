import useNavigate from '@/hooks/useNavigate.hook';
import locales from '@/locales';
import { Box, Button, Typography, useTheme } from '@mui/material';

export default function NotFound() {
  const theme = useTheme();
  const navigate = useNavigate();

  const goHome = () => {
    navigate({
      route: '/'
    });
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
