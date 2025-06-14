export type ConnectionDetailRequestType = {
  connectionId: string | number;
};

export type CreateConnectionRequestType = {
  name: string;
  type: 'postgresql';
  isActive?: boolean;
  options: PostgresqlOptionsType;
};

export type UpdateConnectionRequestType = {
  name?: string;
  type?: 'postgresql';
  isActive?: boolean;
  options?: PostgresqlOptionsType;
};

export type PostgresqlOptionsType = {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  uri?: string;
};
