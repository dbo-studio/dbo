import { useConnectionStore } from '@/store/connectionStore/connection.store';
import type { ConnectionType } from '@/types';
import { useMemo } from 'react';

export const useCurrentConnection = (): ConnectionType | undefined => {
  const connections = useConnectionStore((state) => state.connections);
  const currentConnectionId = useConnectionStore((state) => state.currentConnectionId);

  return useMemo(() => {
    if (!connections?.length || currentConnectionId == null) {
      return undefined;
    }

    return connections.find((c) => c.id === Number(currentConnectionId));
  }, [connections, currentConnectionId]);
};
