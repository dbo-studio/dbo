export type JobDetailResponse = {
  id: string;
  type: 'import' | 'export';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  message: string;
  error?: string;
  result?: any;
};
