import { ConnectionType } from './Connection';

export type ConnectionStore = {
  connections: ConnectionType[];
  currentConnection: ConnectionType;
};
