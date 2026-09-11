import type { MysqlOptionsType, PostgresqlOptionsType, SQLiteOptionsType } from '@/api/connection/types';
import type { ConnectionEngine } from '@/core/db/connectionAliases';

export type ConnectionSafeMode = 'silent' | 'alert' | 'alert_write' | 'safe' | 'safe_write';

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
  access?: ConnectionAccess;
  shared?: boolean;
  passwordShared?: boolean;
}
