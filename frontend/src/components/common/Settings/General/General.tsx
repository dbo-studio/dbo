import locales from '@/locales';
import type { EventFor } from '@/types';
import { Box, Button, Divider, Switch, Typography } from '@mui/material';

export default function General() {
  const handleChangeDebugMode = (event: EventFor<'input', 'onChange'>) => {
    console.log(event.target.checked);
  };

  return (
    <Box>
      <Typography color={'textTitle'} variant='h6'>
        {locales.general}
      </Typography>
      <Divider />

      <Box mt={2}>
        <Box display={'flex'} mb={1} flexDirection={'row'} alignItems={'center'} justifyContent={'space-between'}>
          <Box>
            <Typography color={'textTitle'} variant={'subtitle2'}>
              Debug mode
            </Typography>
            <Typography color={'textText'} variant={'caption'}>
              Enable Debug console
            </Typography>
          </Box>

          <Switch onChange={handleChangeDebugMode} />
        </Box>
        <Divider />
      </Box>

      <Box mt={1}>
        <Box display={'flex'} mb={1} flexDirection={'row'} alignItems={'center'} justifyContent={'space-between'}>
          <Box>
            <Typography color={'textText'} variant={'subtitle2'}>
              Show logs
            </Typography>
          </Box>

          <Button variant={'outlined'} size={'small'}>
            Open
          </Button>
        </Box>
        <Divider />
      </Box>

      <Box mt={1}>
        <Box display={'flex'} mb={1} flexDirection={'row'} alignItems={'center'} justifyContent={'space-between'}>
          <Box>
            <Typography color={'textTitle'} variant={'subtitle2'}>
              Reload
            </Typography>
            <Typography color={'textText'} variant={'caption'}>
              Reload DBO core
            </Typography>
          </Box>

          <Button variant={'outlined'} color={'error'} size={'small'}>
            Reload
          </Button>
        </Box>
        <Divider />
      </Box>
    </Box>
  );
}
