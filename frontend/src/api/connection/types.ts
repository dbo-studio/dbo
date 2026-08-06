import type { ConnectionSafeMode } from '@/types';

export type ConnectionDetailRequestType = {
  connectionId: string | number;
};

export type CreateConnectionRequestType = {
  name: string;
  type: 'postgresql' | 'sqlite' | 'mysql';
  options: PostgresqlOptionsType | SQLiteOptionsType | MysqlOptionsType;
  rememberPassword?: boolean;
  safeMode?: ConnectionSafeMode;
};

export type PingConnectionRequestType = {
  id?: number;
  type: 'postgresql' | 'sqlite' | 'mysql';
  options: PostgresqlOptionsType | SQLiteOptionsType | MysqlOptionsType;
};

export type PingConnectionResponseType = {
  latencyMs: number;
  serverVersion?: string;
  sslNegotiated?: boolean;
  sslMode?: string;
};

export type UpdateConnectionRequestType = {
  id?: string | number;
  name?: string;
  type?: 'postgresql' | 'sqlite' | 'mysql';
  isActive?: boolean;
  isClose?: boolean;
  rememberPassword?: boolean;
  options?: PostgresqlOptionsType | SQLiteOptionsType | MysqlOptionsType;
  safeMode?: ConnectionSafeMode;
};

export type SetConnectionCredentialsRequestType = {
  id: string | number;
  password: string;
  rememberPassword: boolean;
};

export type ConnectionSSLOptionsType = {
  mode?: string;
  caCert?: string;
  clientCert?: string;
  clientKey?: string;
};

export type PostgresqlOptionsType = {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  uri?: string;
  ssl?: ConnectionSSLOptionsType;
};

export type MysqlOptionsType = {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  uri?: string;
  ssl?: ConnectionSSLOptionsType;
};

export type SQLiteOptionsType = {
  path?: string;
  file?: string;
  isPing?: boolean;
};

export type SafeModeUnlockResponseType = {
  unlockedUntil: string;
};
