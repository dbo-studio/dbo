import Loading from '@/components/layout/AppHeader/ConnectionInfo/ConnectionBox/Loading/Loading.tsx';
import type { ConnectionBoxStatus } from '@/components/layout/AppHeader/ConnectionInfo/types.ts';
import { useCurrentConnection } from '@/hooks';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store.ts';
import { Box, Typography } from '@mui/material';
import { type JSX, useEffect, useState } from 'react';
import { ConnectionBoxStyled } from './ConnectionBox.styled.ts';

export default function ConnectionBox(): JSX.Element {
  const loading = useConnectionStore((state) => state.loading);
  const [info, setInfo] = useState('');
  const [status, setStatus] = useState<ConnectionBoxStatus>('loading');
  const currentConnection = useCurrentConnection();

  useEffect(() => {
    if (loading === 'loading') {
      setStatus('loading');
      return;
    }

    if (loading === 'error') {
      setStatus('error');
      setInfo(locales.connection_error);
      return;
    }

    if (!currentConnection) {
      setInfo(locales.no_active_connection);
      setStatus('disable');
      return;
    }

    setInfo(currentConnection.info);
    setStatus('finished');
  }, [currentConnection, loading]);

  return (
    <ConnectionBoxStyled status={status}>
      <Box display={'flex'} alignItems={'center'} flexDirection={'row'}>
        <Typography variant='body2' component='h6'>
          {loading === 'loading' && locales.connecting}
          {loading === 'finished' && info}
          {loading === 'error' && info}
        </Typography>
        {loading === 'loading' && <Loading />}
      </Box>
    </ConnectionBoxStyled>
  );
}
