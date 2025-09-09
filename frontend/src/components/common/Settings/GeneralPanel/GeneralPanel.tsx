import locales from '@/locales';
import { Box, Divider, Typography } from '@mui/material';
import type { JSX } from 'react';
import { CheckUpdate } from './CheckUpdate/CheckUpdate';
import { DebugMode } from './DebugMode/DebugMode';
import { ShowLogs } from './ShowLogs/ShowLogs';


export default function GeneralPanel(): JSX.Element {
  return (
    <Box>
      <Typography color={'textTitle'} variant='h6'>
        {locales.general}
      </Typography>
      <Divider />

      <CheckUpdate />
      <DebugMode />
      <ShowLogs />



      {/*<Box mt={1}>*/}
      {/*  <Box display={'flex'} mb={1} flexDirection={'row'} alignItems={'center'} justifyContent={'space-between'}>*/}
      {/*    <Box>*/}
      {/*      <Typography color={'textTitle'} variant={'subtitle2'}>*/}
      {/*        Reload*/}
      {/*      </Typography>*/}
      {/*      <Typography color={'textText'} variant={'caption'}>*/}
      {/*        Reload DBO core*/}
      {/*      </Typography>*/}
      {/*    </Box>*/}

      {/*    <Button variant={'outlined'} color={'error'} size={'small'}>*/}
      {/*      Reload*/}
      {/*    </Button>*/}
      {/*  </Box>*/}
      {/*  <Divider />*/}
      {/*</Box>*/}
    </Box>
  );
}
