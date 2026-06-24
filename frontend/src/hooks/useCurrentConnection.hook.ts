import { useConnectionStore } from '@/store/connectionStore/connection.store';
import type { ConnectionType } from '@/types';
import { useMemo } from 'react';

export const useCurrentConnection = (): ConnectionType | undefined => {
  const connections = useConnectionStore((state) => state.connections);
  const currentConnectionId = useConnectionStore((state) => state.currentConnectionId);

  return useMemo(() => {
    if (!connections?.length) {
      return undefined;
    }

    if (currentConnectionId) {
      return connections.find((c) => c.id === Number(currentConnectionId));
    }

    return connections.find((c) => c.isActive);
  }, [connections, currentConnectionId]);
};
