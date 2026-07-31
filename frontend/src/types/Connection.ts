import type { MysqlOptionsType, PostgresqlOptionsType, SQLiteOptionsType } from '@/api/connection/types';

export type ConnectionSafeMode = 'silent' | 'alert' | 'alert_write' | 'safe' | 'safe_write';

export type ConnectionOptionsType = PostgresqlOptionsType | MysqlOptionsType | SQLiteOptionsType;

export interface ConnectionType {
  id: number;
  name: string;
  type: 'postgresql' | 'sqlite' | 'mysql';
  isActive: boolean;
  isOpen: boolean;
  info: string;
  icon: string;
  options: ConnectionOptionsType;
  safeMode?: ConnectionSafeMode;
  safeModeUnlocked?: boolean;
  safeModeUnlockUntil?: string;
}
