import { autoChart, CHART_TYPES, type ChartSpec, type ChartType } from '@/core/charts/chartSpec';
import type { AiToolTrace } from '@/types';

/** A chart the agent drew with show_chart: its query, how to draw it, and the rows it got. */
export type ChartReport = {
  id: string;
  title: string;
  sql: string;
  spec: ChartSpec;
  rows: Record<string, unknown>[];
  columns: string[];
  /** Set once the report is saved. */
  questionId?: number;
  /** Default values of the {{filters}} in sql. */
  params?: Record<string, string>;
};

type ShowChartArgs = {
  sql?: string;
  title?: string;
  type?: string;
  x?: string;
  y?: string[];
  stacked?: boolean;
  group?: string;
  size?: string;
  goal?: number;
  params?: Record<string, string>;
};

/** Reads a finished show_chart call; the agent's chart settings win, the auto pick fills the gaps. */
export function reportFromTrace(trace: AiToolTrace): ChartReport | undefined {
  if (trace.name !== 'show_chart' || trace.status !== 'done' || !trace.result) return undefined;
  try {
    const args = JSON.parse(trace.args ?? '{}') as ShowChartArgs;
    const result = JSON.parse(trace.result) as { rows?: Record<string, unknown>[]; columns?: { name: string }[] };
    const rows = result.rows ?? [];
    const columns = result.columns?.map((column) => column.name) ?? Object.keys(rows[0] ?? {});
    const auto = autoChart(rows, columns);
    const type = CHART_TYPES.includes(args.type as ChartType) ? (args.type as ChartType) : auto.type;
    const y = (args.y ?? []).filter((column) => columns.includes(column));

    return {
      id: trace.id,
      title: args.title ?? '',
      sql: args.sql ?? '',
      rows,
      columns,
      spec: {
        type,
        x: args.x && columns.includes(args.x) ? args.x : auto.x,
        y: y.length > 0 ? y : auto.y,
        stacked: args.stacked,
        group: args.group && columns.includes(args.group) ? args.group : undefined,
        size: args.size && columns.includes(args.size) ? args.size : undefined,
        goal: args.goal
      },
      params: args.params
    };
  } catch {
    return undefined;
  }
}
