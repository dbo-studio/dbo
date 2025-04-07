import type { ConnectionType } from '@/types';

export type ConnectionStore = {
  loading: LoadingType;
  connections: ConnectionType[] | undefined;
  currentConnectionId: string | number | undefined;

  currentConnection: () => ConnectionType | undefined;
  updateLoading: (loading: LoadingType) => void;
  updateConnections: (connections: ConnectionType[]) => void;
  updateCurrentConnection: (connection: ConnectionType | undefined) => void;
};

export type LoadingType = 'loading' | 'error' | 'finished';
