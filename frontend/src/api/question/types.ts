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
  updatedAt: string;
};

export type SaveQuestionRequestType = {
  connectionId: number;
  database?: string;
  schema?: string;
  name: string;
  sql: string;
  chart: ChartSpec;
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
