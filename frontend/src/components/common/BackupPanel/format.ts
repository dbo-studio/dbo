import locales from '@/locales';
import type { BackupScheduleType } from '@/api/backup/types';

const pad = (n: number): string => String(n).padStart(2, '0');

export const formatSize = (bytes: number): string => {
  if (bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const formatDate = (value?: string): string =>
  value ? new Date(value).toLocaleString() : locales.backup_job_never;

/** "Every day 02:00 UTC" style summary of a job's cadence. */
export const describeCadence = (
  s: Pick<BackupScheduleType, 'cadence' | 'hour' | 'minute' | 'weekday' | 'monthDay' | 'timezone'>
): string => {
  if (s.cadence === 'hourly') return `${locales.backup_schedule_hourly} :${pad(s.minute)}`;

  const time = `${pad(s.hour)}:${pad(s.minute)} ${s.timezone}`;
  if (s.cadence === 'weekly') {
    return `${locales.backup_schedule_weekly}, ${locales[`weekday_${s.weekday}` as keyof typeof locales]} ${time}`;
  }

  if (s.cadence === 'monthly') return `${locales.backup_schedule_monthly}, ${locales.backup_schedule_month_day} ${s.monthDay ?? 1} ${time}`;

  return `${locales.backup_schedule_daily} ${time}`;
};

export const statusLabel = (status: BackupScheduleType['lastStatus']): string => {
  switch (status) {
    case 'completed':
      return locales.backup_status_completed;
    case 'failed':
      return locales.backup_status_failed;
    case 'running':
      return locales.backup_status_running;
    default:
      return locales.backup_status_none;
  }
};
