import type { MysqlOptionsType, PostgresqlOptionsType, SQLiteOptionsType } from '@/api/connection/types';
import type { ConnectionEngine } from '@/core/db/connectionAliases';

export type ConnectionSafeMode = 'silent' | 'alert' | 'alert_write' | 'safe' | 'safe_write';

/** How far the AI agent may go on a connection. */
export type AgentTier = 'read_only' | 'data_write' | 'schema_change';

export type ConnectionAccess = 'owner' | 'viewer' | 'editor';

export type ConnectionOptionsType = PostgresqlOptionsType | MysqlOptionsType | SQLiteOptionsType;

export interface ConnectionType {
  id: number;
  name: string;
  type: ConnectionEngine;
  isActive: boolean;
  isOpen: boolean;
  info: string;
  icon: string;
  options: ConnectionOptionsType;
  safeMode?: ConnectionSafeMode;
  safeModeUnlocked?: boolean;
  safeModeUnlockUntil?: string;
  agentTier?: AgentTier;
  access?: ConnectionAccess;
  shared?: boolean;
  passwordShared?: boolean;
}
