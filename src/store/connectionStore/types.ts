import { ConnectionType } from '@/src/types';

export type ConnectionStore = {
  showAddConnection: boolean;
  connections: ConnectionType[] | undefined;
  currentConnection: ConnectionType | undefined;
  currentSchema: DataCurrentSchemaType;
  getCurrentSchema: () => string | undefined;
  updateConnections: (connections: ConnectionType[]) => void;
  updateCurrentConnection: (connections: ConnectionType) => void;
  updateCurrentSchema: (currentSchema: string) => void;
  updateShowAddConnection: (show: boolean) => void;
};

export type DataCurrentSchemaType = {
  [key: string]: string | undefined;
};
