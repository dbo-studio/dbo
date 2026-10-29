import type { ChartSpec } from '@/core/charts/chartSpec';

/** A saved report. */
export type QuestionType = {
  id: number;
  connectionId: number;
  database?: string;
  schema?: string;
  name: string;
  sql: string;
  chart: ChartSpec;
  /** Default values of the {{filters}} in its SQL. */
  params: Record<string, string>;
  updatedAt: string;
};

export type SaveQuestionRequestType = {
  connectionId: number;
  database?: string;
  schema?: string;
  name: string;
  sql: string;
  chart: ChartSpec;
  params?: Record<string, string>;
};

export type QuestionResultType = {
  rows: Record<string, unknown>[];
  columns?: { name: string }[];
};

/** Values for the {{name}} filters in a report's SQL. */
export type QuestionParams = Record<string, string>;

export type PreviewQuestionRequestType = {
  connectionId: number;
  database?: string;
  schema?: string;
  sql: string;
  params?: QuestionParams;
};

export type FieldValuesRequestType = {
  connectionId: number;
  database?: string;
  schema?: string;
  /** table.column of a field filter. */
  field: string;
};
