import api from '@/api';
import useAPI from '@/hooks/useApi.hook';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import type { ConnectionType } from '@/types';
import { Suspense, lazy, useEffect, useState } from 'react';
import { v4 as uuid } from 'uuid';

import type { updateConnectionType } from '@/api/connection/types';
import useNavigate from '@/hooks/useNavigate.hook';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import ConnectionItem from './ConnectionItem/ConnectionItem';
import { ConnectionsStyled } from './Connections.styled';
import { EmptySpaceStyle } from './EmptySpace.styled';

const AddConnection = lazy(() => import('../AddConnection/AddConnection'));
const EditConnection = lazy(() => import('../EditConnection/EditConnection'));

export default function Connections() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentConnection, connections, updateCurrentConnection, updateLoading, loading } = useConnectionStore();
  const [loadingConnectionId, setLoadingConnectionId] = useState<number | undefined>(undefined);
  const navigate = useNavigate();

  const { request: getConnectionDetail, pending: pendingGetDetail } = useAPI({
    apiMethod: api.connection.getConnectionDetail
  });

  const { request: updateConnection } = useAPI({
    apiMethod: api.connection.updateConnection
  });

  useEffect(() => {
    if (!connections) {
      return;
    }

    if (connections.length === 0) {
      searchParams.set('showAddConnection', 'true');
      setSearchParams(searchParams);
    }

    if (connections.length > 0) {
      const activeConnection = connections.filter((c: ConnectionType) => c.isActive);
      if (activeConnection.length > 0) handleChangeCurrentConnection(activeConnection[0]).then();
    } else {
      searchParams.set('showAddConnection', 'true');
      setSearchParams(searchParams);
    }
  }, [connections]);

  const handleChangeCurrentConnection = async (c: ConnectionType) => {
    if (c.id === currentConnection?.id || loading === 'loading') {
      return;
    }

    try {
      setLoadingConnectionId(c.id);
      updateLoading('loading');
      const connectionDetail = await getConnectionDetail({
        connectionID: c?.id,
        fromCache: true
      });

      updateCurrentConnection(connectionDetail);
      await updateConnection({
        id: c.id,
        is_active: true
      } as updateConnectionType);

      updateLoading('finished');

      navigate({
        connectionId: c.id
      });
    } catch (error) {
      updateLoading('error');
      if (axios.isAxiosError(error)) {
        toast.error(error.message);
      }
      console.log('🚀 ~ handleChangeCurrentConnection ~ err:', error);
    }
  };

  return (
    <ConnectionsStyled>
      <Suspense>
        <AddConnection />
      </Suspense>
      <Suspense>
        <EditConnection />
      </Suspense>
      {connections?.map((c: ConnectionType) => (
        <ConnectionItem
          loading={pendingGetDetail && loadingConnectionId === c.id}
          onClick={() => handleChangeCurrentConnection(c)}
          key={uuid()}
          selected={c.id === currentConnection?.id}
          connection={c}
        />
      ))}
      <EmptySpaceStyle />
    </ConnectionsStyled>
  );
}
