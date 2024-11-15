import type { ConnectionType } from '@/types';

export type ConnectionStore = {
  loading: boolean;
  updateLoading: (loading: boolean) => void;
  showEditConnection: ConnectionType | undefined;
  connections: ConnectionType[] | undefined;
  currentConnection: ConnectionType | undefined;
  updateConnections: (connections: ConnectionType[]) => void;
  updateCurrentConnection: (connection: ConnectionType | undefined) => void;
  updateShowEditConnection: (connections: ConnectionType | undefined) => void;
};
