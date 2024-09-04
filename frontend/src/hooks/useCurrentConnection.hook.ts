import { useConnectionStore } from '@/store/connectionStore/connection.store';
import type { ConnectionType } from '@/types';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

export const useCurrentConnection = (): ConnectionType | undefined => {
  const { connectionId } = useParams();
  const { connections, currentConnection } = useConnectionStore();

  return useMemo(() => {
    if (!connectionId) {
      return currentConnection;
    }

    return connections?.find((connection) => connection.id === Number(connectionId));
  }, [connectionId, connections, currentConnection]);
};
