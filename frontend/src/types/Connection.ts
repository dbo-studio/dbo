export type ConnectionSafeMode = 'silent' | 'alert' | 'alert_write' | 'safe' | 'safe_write';

export interface ConnectionType {
  id: number;
  name: string;
  type: 'postgresql' | 'sqlite' | 'mysql';
  isActive: boolean;
  isOpen: boolean;
  info: string;
  icon: string;
  options: Record<string, string | number | boolean>;
  safeMode?: ConnectionSafeMode;
  safeModeUnlocked?: boolean;
  safeModeUnlockUntil?: string;
}
