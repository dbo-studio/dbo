import type { AiToolTrace, SchemaChangeOp } from '@/types';

export type SchemaSuggestion = { kind: string; table: string; message: string; ops?: SchemaChangeOp[] };

/** What a finished review_schema call found, and where, so a fix lands in the same database and schema. */
export type SchemaReview = { id: string; database: string; schema: string; suggestions: SchemaSuggestion[] };

export function reviewFromTrace(trace: AiToolTrace): SchemaReview | undefined {
  if (trace.name !== 'review_schema' || trace.status !== 'done' || !trace.result) return undefined;
  try {
    const result = JSON.parse(trace.result) as Omit<SchemaReview, 'id'>;
    return { id: trace.id, database: result.database, schema: result.schema, suggestions: result.suggestions ?? [] };
  } catch {
    return undefined;
  }
}
