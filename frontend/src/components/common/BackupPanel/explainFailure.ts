import type { BackupArtifactType } from '@/api/backup/types';

const LOG_LINES = 40;

/** The message that asks the assistant why a backup failed, with the facts it needs to answer. */
export const explainFailurePrompt = (run: BackupArtifactType, scheduleName: string): string => {
  const log = run.log.trim().split('\n').slice(-LOG_LINES).join('\n');

  return [
    `A scheduled database backup failed. Explain the most likely cause and how to fix it.`,
    `Schedule: ${scheduleName}`,
    `Driver: ${run.driver}${run.tool ? `, tool: ${run.tool} ${run.toolVersion}` : ''}`,
    `Error: ${run.error}`,
    log ? `Last log lines:\n${log}` : ''
  ]
    .filter(Boolean)
    .join('\n');
};
