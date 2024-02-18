import { ConnectionType } from '@/src/types';

export type ConnectionStore = {
  showAddConnection: boolean;
  showEditConnection: ConnectionType | undefined;
  connections: ConnectionType[] | undefined;
  currentConnection: ConnectionType | undefined;
  currentSchema: DataCurrentSchemaType;
  getCurrentSchema: () => string | undefined;
  updateConnections: (connections: ConnectionType[]) => void;
  updateCurrentConnection: (connections: ConnectionType) => void;
  updateCurrentSchema: (currentSchema: string) => void;
  updateShowAddConnection: (show: boolean) => void;
  updateShowEditConnection: (connections: ConnectionType | undefined) => void;
};

export type DataCurrentSchemaType = {
  [key: string]: string | undefined;
};
