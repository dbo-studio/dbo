export type ConnectionDetailRequestType = {
  connectionId: string | number;
};

export type CreateConnectionRequestType = {
  name: string;
  type: 'postgresql' | 'sqlite' | 'mysql';
  options: PostgresqlOptionsType | SQLiteOptionsType | MysqlOptionsType;
  rememberPassword?: boolean;
};

export type UpdateConnectionRequestType = {
  name?: string;
  type?: 'postgresql' | 'sqlite' | 'mysql';
  isActive?: boolean;
  isClose?: boolean;
  rememberPassword?: boolean;
  options?: PostgresqlOptionsType | SQLiteOptionsType | MysqlOptionsType;
};

export type SetConnectionCredentialsRequestType = {
  password: string;
  rememberPassword: boolean;
};

export type PostgresqlOptionsType = {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  uri?: string;
};

export type MysqlOptionsType = {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  uri?: string;
};

export type SQLiteOptionsType = {
  file?: string;
  isPing?: boolean;
};
