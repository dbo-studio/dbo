import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon.tsx';
import LoadingIconButton from '@/components/base/LoadingIconButton/LoadingIconButton.tsx';
import Loading from '@/components/layout/AppHeader/ConnectionInfo/ConnectionBox/Loading/Loading.tsx';
import type { ConnectionBoxStatus } from '@/components/layout/AppHeader/ConnectionInfo/types.ts';
import useAPI from '@/hooks/useApi.hook.ts';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store.ts';
import { Box, Typography } from '@mui/material';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ConnectionBoxStyled } from './ConnectionBox.styled.ts';

export default function ConnectionBox() {
  const { currentConnection, loading, updateLoading, updateCurrentConnection } = useConnectionStore();
  const [info, setInfo] = useState('');
  const [status, setStatus] = useState<ConnectionBoxStatus>('loading');

  const { request: getConnectionDetail } = useAPI({
    apiMethod: api.connection.getConnectionDetail
  });

  useEffect(() => {
    if (loading === 'loading') {
      setStatus('loading');
      return;
    }

    if (!currentConnection || !currentConnection.currentSchema) {
      setInfo(locales.no_active_connection);
      setStatus('disable');
      return;
    }

    setInfo(
      `${currentConnection?.name} | ${currentConnection?.driver} ${currentConnection?.version} : ${currentConnection.currentSchema} :  SQL Query`
    );
    setStatus('finished');
  }, [currentConnection, loading]);

  const handleRefresh = () => {
    if (!currentConnection) {
      return;
    }
    updateLoading('loading');
    getConnectionDetail({
      connectionID: currentConnection?.id,
      fromCache: false
    })
      .then((res) => {
        updateCurrentConnection(res);
        updateLoading('finished');
      })
      .catch((e) => {
        updateLoading('error');
        if (axios.isAxiosError(e)) {
          toast.error(e.message);
        }
        console.log('🚀 ~ handleRefresh ~ err:', e);
      });
  };

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

      <LoadingIconButton onClick={handleRefresh} loading={loading === 'loading'} disabled={loading === 'loading'}>
        <CustomIcon type={'refresh'} />
      </LoadingIconButton>
    </ConnectionBoxStyled>
  );
}
