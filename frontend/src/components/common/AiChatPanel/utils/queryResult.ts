import type { AiToolTrace } from '@/types';

/** The rows a finished execute_sql call returned, with a short name for its tab and chip. */
export type QueryResult = {
  id: string;
  title: string;
  sql: string;
  rows: Record<string, unknown>[];
  columns?: string[];
  /** Column types as the database named them, when the result carried them. */
  types?: Record<string, string>;
};

const firstTable = /\bfrom\s+(?:"?[\w$]+"?\.)?"?([\w$]+)"?/i;

export function resultFromTrace(trace: AiToolTrace): QueryResult | undefined {
  if (trace.name !== 'execute_sql' || trace.status !== 'done' || !trace.result) return undefined;
  try {
    const parsed = JSON.parse(trace.result) as {
      query?: string;
      rows?: Record<string, unknown>[];
      columns?: { name: string; type?: string }[];
    };
    if (!Array.isArray(parsed.rows)) return undefined;
    // The statement as the agent wrote it, not the copy the server ran with a row limit added.
    const written = (JSON.parse(trace.args ?? '{}') as { sql?: unknown }).sql;
    const sql = typeof written === 'string' ? written : (parsed.query ?? '');
    return {
      id: trace.id,
      title: firstTable.exec(sql)?.[1] ?? 'query',
      sql,
      rows: parsed.rows,
      columns: parsed.columns?.map((column) => column.name),
      types: Object.fromEntries((parsed.columns ?? []).map((column) => [column.name, column.type ?? '']))
    };
  } catch {
    return undefined;
  }
}
