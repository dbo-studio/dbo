import { changeCount } from '@/core/ai/changeCount';
import locales from '@/locales';
import type { AiToolTrace } from '@/types';

const parse = (text: string | undefined): unknown => {
  try {
    return text ? JSON.parse(text) : undefined;
  } catch {
    return undefined;
  }
};

const count = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** One readable line for a tool call: what the agent did, or is doing, and what came back. */
export function describeToolStep(trace: AiToolTrace): string {
  const running = trace.status === 'running' || trace.status === 'error' || trace.status === 'blocked';
  const args = (parse(trace.args) ?? {}) as Record<string, unknown>;
  const result = parse(trace.result);

  switch (trace.name) {
    case 'list_tables':
    case 'list_views': {
      const views = trace.name === 'list_views';
      if (running) return views ? locales.ai_step_listing_views : locales.ai_step_listing_tables;
      const n = Array.isArray(result) ? result.length : 0;
      return locales.ai_step_listed.replace(
        '{items}',
        views
          ? count(n, locales.ai_unit_view, locales.ai_unit_views)
          : count(n, locales.ai_unit_table, locales.ai_unit_tables)
      );
    }
    case 'describe_table': {
      const table = typeof args.table === 'string' ? args.table : '';
      return (running ? locales.ai_step_reading : locales.ai_step_read).replace('{table}', table);
    }
    case 'execute_sql': {
      if (running) return locales.ai_step_running_query;
      const rows = (result as { count?: number; rows?: unknown[] } | undefined)?.count ?? 0;
      return locales.ai_step_ran_query.replace('{rows}', count(rows, locales.ai_unit_row, locales.ai_unit_rows));
    }
    case 'table_stats': {
      const table = typeof args.table === 'string' ? args.table : '';
      return (running ? locales.ai_step_measuring : locales.ai_step_measured).replace('{table}', table);
    }
    case 'explain_query':
      return running ? locales.ai_step_explaining : locales.ai_step_explained;
    case 'propose_schema_change': {
      if (running) return locales.ai_step_proposing;
      const ops = Array.isArray(args.ops) ? args.ops.length : 0;
      return locales.ai_step_proposed.replace('{changes}', changeCount(ops));
    }
    case 'preview_write': {
      if (running) return locales.ai_step_previewing;
      const rows = Number(/(\d+) row/.exec(trace.result ?? '')?.[1] ?? 0);
      return locales.ai_step_previewed.replace('{rows}', count(rows, locales.ai_unit_row, locales.ai_unit_rows));
    }
    case 'update_plan':
      return locales.ai_step_plan;
    case 'pin_report': {
      const board = typeof args.board === 'string' ? args.board : '';
      return running ? locales.ai_step_pinning_report : locales.ai_step_pinned_report.replace('{board}', board);
    }
    case 'save_report': {
      const title = typeof args.title === 'string' ? args.title : '';
      return running ? locales.ai_step_saving_report : locales.ai_step_saved_report.replace('{title}', title);
    }
    case 'show_chart': {
      const title = typeof args.title === 'string' ? args.title : '';
      return (running ? locales.ai_step_drawing_chart : locales.ai_step_drew_chart).replace('{title}', title);
    }
    default:
      return trace.name;
  }
}

/** The SQL or table a step worked on, shown muted after the step line. */
export function toolStepDetail(trace: AiToolTrace): string {
  const args = (parse(trace.args) ?? {}) as Record<string, unknown>;
  if (typeof args.sql === 'string') return args.sql.replace(/\s+/g, ' ');
  return '';
}
