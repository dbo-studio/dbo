export type BackupRequestType = {
  connectionId: number;
  database?: string;
  schema?: string;
  note?: string;
  compress?: boolean;
  /** Encrypts the backup; turned into key material on the server and never stored. */
  passphrase?: string;
  /** Also copy the finished backup to this destination. */
  destinationId?: number;
};

export type RestoreRequestType = {
  connectionId: number;
  database: string;
  schema?: string;
  artifactId: number;
  confirmName: string;
  safetyBackup: boolean;
  passphrase?: string;
  /** Create the database first, so the restore goes into a new empty one. */
  createDatabase?: boolean;
};

export type BackupJobResponseType = {
  jobId: number;
};

export type BackupArtifactType = {
  id: number;
  connectionId: number;
  jobId: number;
  scheduleId: number;
  database: string;
  schema: string;
  driver: string;
  method: 'basic' | 'native' | 'uploaded';
  compressed: boolean;
  encrypted: boolean;
  log: string;
  tool: string;
  toolVersion: string;
  status: 'running' | 'completed' | 'failed';
  note: string;
  fileName: string;
  size: number;
  checksum: string;
  error: string;
  startedAt: string;
  completedAt?: string;
  destinationId: number;
  remoteStatus: '' | 'uploaded' | 'failed';
  remoteError: string;
};

export type BackupToolType = {
  driver: string;
  name: string;
  found: boolean;
  path: string;
  version: string;
  source: 'configured' | 'managed' | 'path' | 'known' | '';
  error: string;
};

export type BackupToolDownloadType = {
  driver: string;
  version: string;
  tools: string[];
  url: string;
  size: number;
  installed: boolean;
};

export type NotifyOnType = 'failure' | 'always' | 'never';

export type BackupCadenceType = 'hourly' | 'daily' | 'weekly';

export type BackupScheduleRequestType = {
  connectionId: number;
  name: string;
  database?: string;
  schema?: string;
  cadence: BackupCadenceType;
  hour: number;
  minute: number;
  weekday: number;
  timezone: string;
  keepLast: number;
  keepDays: number;
  /** One backup per day for a week, per week for a month, per month for a year; replaces keepLast and keepDays. */
  keepSmart?: boolean;
  compress?: boolean;
  /** 0 = keep backups on this machine only. */
  destinationId?: number;
  channelIds?: number[];
  notifyOn?: NotifyOnType;
  /** Write-only: sets the passphrase that encrypts every backup of the job. */
  passphrase?: string;
};

export type BackupScheduleType = Omit<BackupScheduleRequestType, 'database' | 'schema'> & {
  id: number;
  database: string;
  schema: string;
  enabled: boolean;
  encrypted: boolean;
  nextRunAt?: string;
  lastRunAt?: string;
  lastSuccessAt?: string;
  lastSize: number;
  lastStatus: '' | 'running' | 'completed' | 'failed';
  lastError: string;
  /** False when a scheduled run cannot log in: the password is not stored persistently. */
  passwordRemembered: boolean;
};

export type BackupVerifyResultType = {
  ok: boolean;
  message: string;
};

export type DestinationType = 'folder' | 's3' | 'sftp' | 'ftp' | 'gdrive';
export type ChannelType = 'email' | 'slack' | 'discord' | 'telegram' | 'webhook';
export type ConnectorKind = 'destination' | 'channel';

export type ConnectorRequestType = {
  type: DestinationType | ChannelType;
  name: string;
  enabled?: boolean;
  config: Record<string, string | number | boolean>;
  /** Write-only. A key left empty keeps the saved value. */
  secrets: Record<string, string>;
};

export type ConnectorType = {
  id: number;
  kind: ConnectorKind;
  type: DestinationType | ChannelType;
  name: string;
  enabled: boolean;
  config: Record<string, string | number | boolean>;
  /** Which secrets are saved; their values are never returned. */
  secretsSet: Record<string, boolean>;
};
