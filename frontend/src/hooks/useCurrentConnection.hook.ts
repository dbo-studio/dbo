import { useConnectionStore } from '@/store/connectionStore/connection.store';
import type { ConnectionType } from '@/types';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import useNavigate from './useNavigate.hook';

export const useCurrentConnection = (): ConnectionType | undefined => {
  const [searchParams] = useSearchParams();
  const { connections } = useConnectionStore();
  const navigate = useNavigate();

  // return useMemo(() => {
  const params = Object.fromEntries([...searchParams]);

  if (!params.connectionId || params.connectionId === '') {
    return undefined;
  }

  const connection = connections?.find((connection) => connection.id === Number(params.connectionId));

  if (!connection) {
    // navigate({ route: '/' });
    return undefined;
  }

  return connection;
  // }, [searchParams, connections]);
};
