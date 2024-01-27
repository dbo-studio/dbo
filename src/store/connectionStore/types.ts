import { ConnectionType, SchemaType } from '@/src/types/Connection';

export type ConnectionStore = {
  showAddConnection: boolean;
  connections: ConnectionType[] | undefined;
  currentConnection: ConnectionType | undefined;
  currentSchema: DataCurrentSchemaType;
  getCurrentSchema: () => SchemaType | undefined;
  updateConnections: (connections: ConnectionType[]) => void;
  updateCurrentConnection: (connections: ConnectionType) => void;
  updateCurrentSchema: (currentSchema: SchemaType) => void;
  updateShowAddConnection: (show: boolean) => void;
};

export type DataCurrentSchemaType = {
  [key: string]: SchemaType | undefined;
};
