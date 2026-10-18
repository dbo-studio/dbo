export type JobType = {
  id: string;
  type: 'import' | 'export' | 'backup' | 'restore' | 'tool_install';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'canceled';
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
  artifactId?: number;
  successRows: number;
  failedRows: number;
  totalRows: number;
  errors?: ErrorType[];
};
