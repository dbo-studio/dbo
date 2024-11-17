import type { ConnectionType } from '@/types';

export type ConnectionStore = {
  loading: LoadingType;
  updateLoading: (loading: LoadingType) => void;
  showEditConnection: ConnectionType | undefined;
  connections: ConnectionType[] | undefined;
  currentConnection: ConnectionType | undefined;
  updateConnections: (connections: ConnectionType[]) => void;
  updateCurrentConnection: (connection: ConnectionType | undefined) => void;
  updateShowEditConnection: (connections: ConnectionType | undefined) => void;
};

export type LoadingType = 'loading' | 'error' | 'finished';
