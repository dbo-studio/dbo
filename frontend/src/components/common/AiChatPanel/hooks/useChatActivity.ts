import { useAiStore } from '@/store/aiStore/ai.store';
import type { AiAgentItem, AiToolTrace } from '@/types';
import { useMemo } from 'react';
import { isTraceMessage, traceMessageToItem } from '../utils/agentTrace';
import { reportFromTrace, type ChartReport } from '../utils/chartReport';
import { useAiSession } from './useAiSession';

export type QueryResult = {
  sql: string;
  rows: Record<string, unknown>[];
  columns?: string[];
};

export type ChatActivity = {
  /** Every tool call, proposal and plan of the open chat, saved and live, in order. */
  items: AiAgentItem[];
  /** The newest read query that returned rows. */
  lastResult?: QueryResult;
  /** The newest chart the agent drew. */
  lastReport?: ChartReport;
  /** Every SQL statement the agent ran or previewed, oldest first, keyed by its tool call. */
  statements: { id: string; sql: string }[];
};

const queryResult = (trace: AiToolTrace): QueryResult | undefined => {
  if (trace.name !== 'execute_sql' || trace.status !== 'done' || !trace.result) return undefined;
  try {
    const parsed = JSON.parse(trace.result) as {
      query?: string;
      rows?: Record<string, unknown>[];
      columns?: { name: string }[];
    };
    if (!Array.isArray(parsed.rows) || parsed.rows.length === 0) return undefined;
    return { sql: parsed.query ?? '', rows: parsed.rows, columns: parsed.columns?.map((column) => column.name) };
  } catch {
    return undefined;
  }
};

const statementOf = (trace: AiToolTrace): { id: string; sql: string } | undefined => {
  try {
    const sql = (JSON.parse(trace.args ?? '{}') as { sql?: unknown }).sql;
    return typeof sql === 'string' ? { id: trace.id, sql } : undefined;
  } catch {
    return undefined;
  }
};

/** What the agent has done in the open chat, for the workstation canvas. */
export function useChatActivity(): ChatActivity {
  const messages = useAiStore((state) => state.currentChat?.messages);
  const live = useAiSession().agentItems;

  return useMemo(() => {
    const saved = (messages ?? []).filter(isTraceMessage).flatMap((message) => traceMessageToItem(message) ?? []);
    const items = [...saved, ...live];
    const traces = items.flatMap((item) => (item.kind === 'tool' ? [item.trace] : []));

    return {
      items,
      lastResult: traces
        .map(queryResult)
        .filter((result) => result !== undefined)
        .pop(),
      statements: traces.map(statementOf).filter((sql) => sql !== undefined),
      lastReport: traces
        .map(reportFromTrace)
        .filter((report) => report !== undefined)
        .pop()
    };
  }, [messages, live]);
}
