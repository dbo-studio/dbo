import { useConnectionStore } from '@/store/connectionStore/connection.store';
import type { ConnectionType } from '@/types';
import { type JSX, useEffect, useState } from 'react';
import { v4 as uuid } from 'uuid';

import api from '@/api';
import AddConnection from '@/components/common/AddConnection/AddConnection';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { useMutation, useQuery } from '@tanstack/react-query';
import EditConnection from '../../AddConnection/EditConnection';
import ConnectionItem from './ConnectionItem/ConnectionItem';
import { ConnectionsStyled } from './Connections.styled';
import { EmptySpaceStyle } from './EmptySpace.styled';

export default function Connections(): JSX.Element {
  const [loadingConnectionId, setLoadingConnectionId] = useState<number | undefined>(undefined);

  const loading = useConnectionStore((state) => state.loading);
  const currentConnectionId = useConnectionStore((state) => state.currentConnectionId);

  const currentConnection = useConnectionStore((state) => state.currentConnection);
  const updateLoading = useConnectionStore((state) => state.updateLoading);
  const updateCurrentConnection = useConnectionStore((state) => state.updateCurrentConnection);
  const updateConnections = useConnectionStore((state) => state.updateConnections);
  const updateSelectedTab = useTabStore.getState().updateSelectedTab;

  const { data: connections } = useQuery({
    queryKey: ['connections'],
    queryFn: async (): Promise<ConnectionType[]> => {
      updateLoading('loading');
      try {
        const connections = await api.connection.getConnectionList();
        updateConnections(connections);
        if (!currentConnectionId) {
          updateCurrentConnection(connections.find((c) => c.isActive));
        }
        updateLoading('finished');
        return connections;
      } catch (error) {
        updateLoading('error');
        throw error;
      }
    }
  });

  const { mutateAsync: updateConnectionMutation, isPending: pendingUpdateConnection } = useMutation({
    mutationFn: (id: number): Promise<ConnectionType> => api.connection.updateConnection(id, { isActive: true }),
    onMutate: (id: number): void => {
      setLoadingConnectionId(id);
      updateLoading('loading');
    },
    onSuccess: (c: ConnectionType): void => {
      updateLoading('finished');
      updateCurrentConnection(c);
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
      useSettingStore.getState().toggleShowAddConnection(true);
    }
  }, [connections]);

  const handleChangeCurrentConnection = async (c: ConnectionType): Promise<void> => {
    const tabs = useTabStore.getState().tabs;
    if (c.id === currentConnection()?.id || loading === 'loading') {
      return;
    }
    try {
      await updateConnectionMutation(c.id);
      updateSelectedTab(tabs.find((t) => t.connectionId === c.id));
    } catch (error) {
      console.error('🚀 ~ handleChangeCurrentConnection ~ error:', error);
    }
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
          selected={c.id === currentConnection()?.id}
          connection={c}
        />
      ))}
      <EmptySpaceStyle />
    </ConnectionsStyled>
  );
}
