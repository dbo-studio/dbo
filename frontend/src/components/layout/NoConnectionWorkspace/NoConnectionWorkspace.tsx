import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Box, Button, Typography } from '@mui/material';
import type { JSX } from 'react';

export default function NoConnectionWorkspace(): JSX.Element {
  const updateUI = useSettingStore((state) => state.updateUI);

  const openConnections = (): void => {
    updateUI({ showConnectionsDrawer: true });
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        p: 3,
        minHeight: 0,
        width: '100%'
      }}
    >
      <CustomIcon type='database' size='l' />
      <Typography variant='h6' color='textTitle' sx={{ textAlign: 'center' }}>
        {locales.no_active_connection}
      </Typography>
      <Typography variant='body2' color='textText' sx={{ textAlign: 'center' }}>
        {locales.connections_empty_hint}
      </Typography>
      <Button variant='contained' onClick={openConnections}>
        {locales.connections}
      </Button>
    </Box>
  );
}
