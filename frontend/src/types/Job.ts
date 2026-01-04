export type JobType = {
  id: string;
  type: 'import' | 'export';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  message: string;
  error?: string;
  result?: ImportResultType | ExportResultType;
};

export type ErrorType = {
  row: number;
  line: number;
  message: string;
  value: string;
  data: string;
};

export type ImportResultType = {
  fileName: string;
  successRows: number;
  failedRows: number;
  totalRows: number;
  successCount: number;
  failedCount: number;
  errors?: ErrorType[];
};

export type ExportResultType = {
  fileName: string;
  successRows: number;
  failedRows: number;
  totalRows: number;
  errors?: ErrorType[];
};
