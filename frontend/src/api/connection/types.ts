import type { ConnectionEnv, ConnectionSafeMode } from '@/types';
import type { ConnectionEngine } from '@/core/db/connectionAliases';

export type ConnectionDetailRequestType = {
  connectionId: string | number;
};

export type CreateConnectionRequestType = {
  name: string;
  type: ConnectionEngine;
  options: PostgresqlOptionsType | SQLiteOptionsType | MysqlOptionsType | RedisOptionsType | MongoOptionsType;
  rememberPassword?: boolean;
  safeMode?: ConnectionSafeMode;
  env?: ConnectionEnv;
};

export type PingConnectionRequestType = {
  id?: number;
  type: ConnectionEngine;
  options: PostgresqlOptionsType | SQLiteOptionsType | MysqlOptionsType | RedisOptionsType | MongoOptionsType;
};

export type PingConnectionResponseType = {
  latencyMs: number;
  serverVersion?: string;
  sslNegotiated?: boolean;
  sslMode?: string;
  sshTunnel?: boolean;
};

export type UpdateConnectionRequestType = {
  id?: string | number;
  name?: string;
  type?: ConnectionEngine;
  isActive?: boolean;
  isClose?: boolean;
  rememberPassword?: boolean;
  options?: PostgresqlOptionsType | SQLiteOptionsType | MysqlOptionsType | RedisOptionsType | MongoOptionsType;
  safeMode?: ConnectionSafeMode;
  safeModePassword?: string;
  env?: ConnectionEnv;
  agentTier?: 'read_only' | 'data_write' | 'schema_change';
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

export type ConnectionSSHOptionsType = {
  enabled: boolean;
  host?: string;
  port?: number;
  username?: string;
  authMethod?: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  /** Response only: whether the secret is stored. */
  passwordSet?: boolean;
  privateKeySet?: boolean;
  passphraseSet?: boolean;
  jump?: ConnectionSSHOptionsType;
};

export type PostgresqlOptionsType = {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  uri?: string;
  ssl?: ConnectionSSLOptionsType;
  ssh?: ConnectionSSHOptionsType;
};

export type MysqlOptionsType = {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  uri?: string;
  ssl?: ConnectionSSLOptionsType;
  ssh?: ConnectionSSHOptionsType;
};

export type RedisOptionsType = {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: number;
  tls?: boolean;
  tlsInsecure?: boolean;
  isPing?: boolean;
};

export type MongoOptionsType = {
  uri?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  authSource?: string;
  database?: string;
  tls?: boolean;
  tlsInsecure?: boolean;
  isPing?: boolean;
};

export type SQLiteOptionsType = {
  path?: string;
  file?: string;
  isPing?: boolean;
};

export type SafeModeUnlockResponseType = {
  unlockedUntil: string;
};

export type ConnectionShareMemberType = {
  userId: string;
  email: string;
  role: string;
  createdAt: string;
};

export type ConnectionSharesType = {
  passwordShared: boolean;
  members: ConnectionShareMemberType[];
};

export type AdminConnectionShareType = {
  connectionId: number;
  connectionName: string;
  ownerId: string;
  ownerEmail: string;
  passwordShared: boolean;
  members: ConnectionShareMemberType[];
};

export type AdminConnectionCatalogItemType = {
  id: number;
  name: string;
  type: ConnectionEngine;
  ownerId: string;
  ownerEmail: string;
};
