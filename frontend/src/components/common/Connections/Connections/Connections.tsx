import { useConnectionStore } from '@/store/connectionStore/connection.store';
import type { ConnectionType } from '@/types';
import { useEffect, useState } from 'react';
import { v4 as uuid } from 'uuid';

import type { updateConnectionType } from '@/api/connection/types';
import useNavigate from '@/hooks/useNavigate.hook';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import ConnectionItem from './ConnectionItem/ConnectionItem';
import { ConnectionsStyled } from './Connections.styled';
import { EmptySpaceStyle } from './EmptySpace.styled';
import AddConnection from '@/components/common/Connections/AddConnection/AddConnection.tsx';
import EditConnection from '@/components/common/Connections/EditConnection/EditConnection.tsx';
import { useMutation } from '@tanstack/react-query';
import api from '@/api';

export default function Connections() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentConnection, connections, updateCurrentConnection, updateLoading, loading } = useConnectionStore();
  const [loadingConnectionId, setLoadingConnectionId] = useState<number | undefined>(undefined);
  const navigate = useNavigate();

  const { mutateAsync: connectionDetailMutation } = useMutation({ mutationFn: api.connection.getConnectionDetail });
  const { mutateAsync: updateConnectionMutation, isPending: pendingUpdateConnection } = useMutation({
    mutationFn: api.connection.updateConnection
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
      const connectionDetail = await connectionDetailMutation({
        connectionId: c?.id,
        fromCache: true
      });

      await updateConnectionMutation({
        id: c.id,
        is_active: true
      } as updateConnectionType);

      updateCurrentConnection(connectionDetail);
      updateLoading('finished');

      navigate({
        connectionId: c.id,
        tabId: ''
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
      <AddConnection />
      <EditConnection />
      {connections?.map((c: ConnectionType) => (
        <ConnectionItem
          loading={pendingUpdateConnection && loadingConnectionId === c.id}
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
