export interface QueryResponseType extends ResponseType {
  table: number;
}

export interface ConnectionResponseType extends ResponseType {
  id: number;
  name: string;
  host: string;
  username: string;
  port: number;
  database: string;
}

export type ResponseType = {};
