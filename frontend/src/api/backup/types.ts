export type BackupRequestType = {
  connectionId: number;
  database?: string;
  schema?: string;
  note?: string;
};

export type RestoreRequestType = {
  connectionId: number;
  database: string;
  schema?: string;
  artifactId: number;
  confirmName: string;
  safetyBackup: boolean;
  passphrase?: string;
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
};

export type BackupToolType = {
  driver: string;
  name: string;
  found: boolean;
  path: string;
  version: string;
  source: 'path' | 'managed' | '';
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
  compress?: boolean;
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
