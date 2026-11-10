export type ImportRequestType = {
  connectionId: number;
  table: string;
  data: File;
  format: string;
  delimiter?: string;
  /** File column -> table column; a file column left out is not imported. */
  mapping?: Record<string, string>;
  continueOnError: boolean;
  skipErrors: boolean;
  maxErrors: number;
};

export type ExportScopeType = 'query' | 'tables' | 'schema' | 'database';

export type ExportContentType = 'data' | 'schema' | 'both';

export type ExportRequestType = {
  connectionId: number;
  scope?: ExportScopeType;
  table?: string;
  query?: string;
  tables?: string[];
  database?: string;
  schema?: string;
  content?: ExportContentType;
  format: string;
  chunkSize?: number;
  savePath?: string;
};

export type JobResponseType = {
  jobId: string;
};

export type ImportPreviewType = {
  columns: string[];
  rows: string[][];
  totalRows: number;
};
