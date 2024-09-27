import type { ConnectionType } from '@/types';

export type ConnectionStore = {
  showAddConnection: boolean;
  showEditConnection: ConnectionType | undefined;
  connections: ConnectionType[] | undefined;
  currentConnection: ConnectionType | undefined;
  updateConnections: (connections: ConnectionType[]) => void;
  updateCurrentConnection: (connection: ConnectionType | undefined) => void;
  updateShowAddConnection: (show: boolean) => void;
  updateShowEditConnection: (connections: ConnectionType | undefined) => void;
};

export type DatabaseSlice = {
  showSelectDatabase: boolean;
  updateShowSelectDatabase: (show: boolean) => void;
};
