import { useConnectionStore } from '@/store/connectionStore/connection.store';
import type { ConnectionType } from '@/types';
import { type JSX, useEffect, useState } from 'react';
import { v4 as uuid } from 'uuid';

import api from '@/api';
import AddConnection from '@/components/common/AddConnection/AddConnection';
import { useCurrentConnection } from '@/hooks';
import useNavigate from '@/hooks/useNavigate.hook';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import EditConnection from '../../AddConnection/EditConnection';
import ConnectionItem from './ConnectionItem/ConnectionItem';
import { ConnectionsStyled } from './Connections.styled';
import { EmptySpaceStyle } from './EmptySpace.styled';

export default function Connections(): JSX.Element {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { connections, updateLoading, loading } = useConnectionStore();
  const currentConnection = useCurrentConnection();
  const [loadingConnectionId, setLoadingConnectionId] = useState<number | undefined>(undefined);
  const navigate = useNavigate();

  const { mutateAsync: updateConnectionMutation, isPending: pendingUpdateConnection } = useMutation({
    mutationFn: (id: number): Promise<ConnectionType> => api.connection.updateConnection(id, { isActive: true }),
    onMutate: (id: number): void => {
      setLoadingConnectionId(id);
      updateLoading('loading');
    },
    onSuccess: (c: ConnectionType): void => {
      queryClient.invalidateQueries({
        queryKey: ['connections']
      });

      updateLoading('finished');
      navigate({
        connectionId: c.id,
        tabId: ''
      });
    },
    onError: (error): void => {
      console.error('🚀 ~ updateConnectionMutation ~ error:', error);
      updateLoading('error');
    }
  });

  useEffect(() => {
    if (!connections) {
      return;
    }

    if (connections.length === 0) {
      searchParams.set('showAddConnection', 'true');
      setSearchParams(searchParams);
    }
  }, [connections]);

  const handleChangeCurrentConnection = async (c: ConnectionType): Promise<void> => {
    if (c.id === currentConnection?.id || loading === 'loading') {
      return;
    }

    try {
      await updateConnectionMutation(c.id);
    } catch (error) {}
  };

  return (
    <ConnectionsStyled>
      <AddConnection />
      <EditConnection />
      {connections?.map((c: ConnectionType) => (
        <ConnectionItem
          loading={pendingUpdateConnection && loadingConnectionId === c.id}
          onClick={(): Promise<void> => handleChangeCurrentConnection(c)}
          key={uuid()}
          selected={c.id === currentConnection?.id}
          connection={c}
        />
      ))}
      <EmptySpaceStyle />
    </ConnectionsStyled>
  );
}
