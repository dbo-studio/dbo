import { ConnectionType } from './Connection';

export interface QueryResponseType extends ResponseType {
  table: number;
}

export interface ConnectionsResponseType extends ResponseType {
  data: ConnectionType[];
}

export interface ConnectionResponseType extends ResponseType {
  data: ConnectionType;
}

export type ResponseType = {
  code: number;
  data: unknown;
  message: string;
};
