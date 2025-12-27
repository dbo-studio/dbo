import type { ExportResultType, ImportResultType } from '@/types/Job';

export type JobDetailResponseType = {
  id: string;
  type: 'import' | 'export';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  message: string;
  error?: string;
  result?: ImportResultType | ExportResultType;
};
