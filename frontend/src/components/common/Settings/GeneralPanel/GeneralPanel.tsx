import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store.ts';
import { Box, Divider, Switch, Typography } from '@mui/material';
import type { JSX } from 'react';

export default function GeneralPanel(): JSX.Element {
  const debug = useSettingStore((state) => state.debug);
  const toggleDebug = useSettingStore((state) => state.toggleDebug);

  const handleChangeDebugMode = (event: React.ChangeEvent<HTMLInputElement>): void => {
    toggleDebug(event?.target?.checked);
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
              {locales.debug_mode}
            </Typography>
            <Typography color={'textText'} variant={'caption'}>
              {locales.enable_debug_console}
            </Typography>
          </Box>

          <Switch checked={debug} onChange={handleChangeDebugMode} />
        </Box>
        {/*<Divider />*/}
      </Box>

      {/*<Box mt={1}>*/}
      {/*  <Box display={'flex'} mb={1} flexDirection={'row'} alignItems={'center'} justifyContent={'space-between'}>*/}
      {/*    <Box>*/}
      {/*      <Typography color={'textText'} variant={'subtitle2'}>*/}
      {/*        Show logs*/}
      {/*      </Typography>*/}
      {/*    </Box>*/}

      {/*    <Button variant={'outlined'} size={'small'}>*/}
      {/*      Open*/}
      {/*    </Button>*/}
      {/*  </Box>*/}
      {/*  <Divider />*/}
      {/*</Box>*/}

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
