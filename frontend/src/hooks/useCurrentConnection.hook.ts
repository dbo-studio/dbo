import { useConnectionStore } from '@/store/connectionStore/connection.store';
import type { ConnectionType } from '@/types';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export const useCurrentConnection = (): ConnectionType | undefined => {
  const [searchParams, _] = useSearchParams();
  const { connections } = useConnectionStore();

  const connectionId = searchParams.get('connectionId');

  return useMemo(() => {
    return connections?.find((c) => c.id === Number(connectionId));
  }, [connections, connectionId]);
};
