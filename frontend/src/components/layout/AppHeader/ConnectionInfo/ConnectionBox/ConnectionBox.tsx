import Loading from '@/components/layout/AppHeader/ConnectionInfo/ConnectionBox/Loading/Loading.tsx';
import type { ConnectionBoxStatus } from '@/components/layout/AppHeader/ConnectionInfo/types.ts';
import { useCurrentConnection } from '@/hooks';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store.ts';
import { Stack, Typography } from '@mui/material';
import { type JSX, useMemo } from 'react';
import { ConnectionBoxContentStyled, ConnectionBoxStyled } from './ConnectionBox.styled.ts';

export default function ConnectionBox(): JSX.Element {
  const loading = useConnectionStore((state) => state.loading);
  const currentConnection = useCurrentConnection();

  const status = useMemo((): ConnectionBoxStatus => {
    if (loading === 'loading') {
      return 'loading';
    }

    if (loading === 'error') {
      return 'error';
    }

    if (!currentConnection) {
      return 'disable';
    }

    return 'finished';
  }, [loading, currentConnection]);

  const info = useMemo(() => {
    if (loading === 'error') {
      return locales.connection_error;
    }

    if (!currentConnection) {
      return locales.no_active_connection;
    }

    return currentConnection.info;
  }, [loading, currentConnection]);

  return (
    <ConnectionBoxStyled status={status}>
      <ConnectionBoxContentStyled>
        <Stack direction='row' spacing={1} sx={{ minWidth: 0, width: '100%', alignItems: 'center' }}>
          <Typography variant='body2' component='h6' noWrap sx={{ flex: 1, minWidth: 0 }}>
            {loading === 'loading' && locales.connecting}
            {loading === 'finished' && info}
            {loading === 'error' && info}
          </Typography>
          {loading === 'loading' && <Loading />}
        </Stack>
      </ConnectionBoxContentStyled>
    </ConnectionBoxStyled>
  );
}
