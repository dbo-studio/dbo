import { useConnectionStore } from '@/store/connectionStore/connection.store';
import type { ConnectionType } from '@/types';
import { useMemo } from 'react';

export const useCurrentConnection = (): ConnectionType | undefined => {
  const connections = useConnectionStore((state) => state.connections);
  const currentConnectionId = useConnectionStore((state) => state.currentConnectionId);
  const currentConnection = useConnectionStore((state) => state.currentConnection);

  return useMemo(() => {
    return currentConnection();
  }, [connections, currentConnectionId, currentConnection]);
};
