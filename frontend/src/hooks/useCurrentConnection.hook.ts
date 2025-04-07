import { useConnectionStore } from '@/store/connectionStore/connection.store';
import type { ConnectionType } from '@/types';
import { useMemo } from 'react';

export const useCurrentConnection = (): ConnectionType | undefined => {
  const { connections, currentConnectionId, currentConnection } = useConnectionStore();

  return useMemo(() => {
    return currentConnection();
  }, [connections, currentConnectionId, currentConnection]);
};
