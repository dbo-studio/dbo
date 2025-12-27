export type ConnectionDetailRequestType = {
  connectionId: string | number;
};

export type CreateConnectionRequestType = {
  name: string;
  type: 'postgresql' | 'sqlite' | 'mysql';
  isActive?: boolean;
  options: PostgresqlOptionsType | SQLiteOptionsType | MysqlOptionsType;
};

export type UpdateConnectionRequestType = {
  name?: string;
  type?: 'postgresql' | 'sqlite' | 'mysql';
  isActive?: boolean;
  options?: PostgresqlOptionsType | SQLiteOptionsType | MysqlOptionsType;
};

export type PostgresqlOptionsType = {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  uri?: string;
};

export type MysqlOptionsType = PostgresqlOptionsType;

export type SQLiteOptionsType = {
  file?: string;
  isPing?: boolean;
};
