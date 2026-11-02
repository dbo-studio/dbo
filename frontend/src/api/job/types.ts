import type { ExportResultType, ImportResultType } from '@/types/Job';

/** A job's result: an import's counts, an export's file, or the rows of a background query. */
export type JobResultType = Partial<ImportResultType & ExportResultType> & {
  data?: unknown;
  size?: number;
  rows?: number;
  format?: string;
};

export type JobDetailResponseType = {
  id: number;
  type: 'import' | 'export' | 'query' | 'backup' | 'restore' | 'tool_install';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'canceled';
  progress: number;
  message: string;
  error?: string;
  result?: JobResultType;
  /** What the job was started with; for a query, its kind and request. */
  data?: { kind?: 'run' | 'raw'; request?: Record<string, unknown> };
  startedAt?: string | null;
  completedAt?: string | null;
};
