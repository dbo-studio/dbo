import locales from '@/locales';
import { formatBytes } from './formatBytes';

/** Byte-level progress the backend writes into a job's message while it downloads or uploads. */
export type TransferMessage = {
  phase: 'download' | 'verify' | 'install' | 'upload' | 'table';
  done: number;
  total: number;
  speed?: number;
  /** Set while a multi-table run works through its tables. */
  name?: string;
};

const LABEL: Record<TransferMessage['phase'], string> = {
  download: locales.backup_tool_phase_download,
  verify: locales.backup_tool_phase_verify,
  install: locales.backup_tool_phase_install,
  upload: locales.backup_phase_upload,
  table: locales.job_phase_table
};

export const parseTransfer = (message: string | undefined): TransferMessage | null => {
  if (!message?.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(message) as TransferMessage;
    return typeof parsed.phase === 'string' && parsed.phase in LABEL ? parsed : null;
  } catch {
    return null;
  }
};

export const transferLabel = (m: TransferMessage): string => LABEL[m.phase];

/** "12.4 MB / 45.0 MB · 3.2 MB/s · 10s left" */
export const transferDetail = (m: TransferMessage): string | undefined => {
  if (m.phase === 'table') return `${m.done}/${m.total} · ${m.name ?? ''}`;
  if (m.phase !== 'download' && m.phase !== 'upload') return undefined;
  const parts = [`${formatBytes(m.done)} / ${formatBytes(m.total)}`];
  if (m.speed && m.speed > 0) {
    parts.push(`${formatBytes(m.speed)}/s`);
    if (m.total > m.done) {
      const secs = Math.ceil((m.total - m.done) / m.speed);
      parts.push(secs >= 60 ? `${Math.floor(secs / 60)}m ${secs % 60}s` : `${secs}s`);
    }
  }
  return parts.join(' · ');
};
