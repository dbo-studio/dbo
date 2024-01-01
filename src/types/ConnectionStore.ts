import { ConnectionType, SchemaType } from './Connection';

export type ConnectionStore = {
  connections: ConnectionType[];
  currentConnection: ConnectionType;
  currentSchema: SchemaType;
};
