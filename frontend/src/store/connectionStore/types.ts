import type { ConnectionType } from '@/types';

export type ConnectionStore = {
  loading: LoadingType;
  updateLoading: (loading: LoadingType) => void;
  connections: ConnectionType[] | undefined;
  updateConnections: (connections: ConnectionType[]) => void;
  updateCurrentConnection: (connection: ConnectionType | undefined) => void;
};

export type LoadingType = 'loading' | 'error' | 'finished';
