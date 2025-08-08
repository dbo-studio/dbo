export type ConnectionDetailRequestType = {
  connectionId: string | number;
};

export type CreateConnectionRequestType = {
  name: string;
  type: 'postgresql' | 'sqlite';
  isActive?: boolean;
  options: PostgresqlOptionsType | SQLiteOptionsType;
};

export type UpdateConnectionRequestType = {
  name?: string;
  type?: 'postgresql' | 'sqlite';
  isActive?: boolean;
  options?: PostgresqlOptionsType | SQLiteOptionsType;
};

export type PostgresqlOptionsType = {
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
