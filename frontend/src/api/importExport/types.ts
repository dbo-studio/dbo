export type ImportRequestType = {
  connectionId: number;
  table: string;
  data: File;
  format: string;
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
