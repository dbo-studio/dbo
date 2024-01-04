import { ConnectionType, SchemaType } from '@/src/types/Connection';

export type ConnectionStore = {
  connections: ConnectionType[];
  currentConnection: ConnectionType;
  currentSchema: SchemaType;
};
