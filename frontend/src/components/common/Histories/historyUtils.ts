import type { HistoryType } from '@/types/History';

export type StatementKind = 'read' | 'write' | 'danger' | 'ddl' | 'other';

export type HistoryRow = { kind: 'day'; key: string; label: string; count: number } | { kind: 'item'; key: string; history: HistoryType };

/** First keyword of a statement, ignoring leading comments and parentheses. */
export function statementVerb(query: string): string {
  const cleaned = query.replace(/^(\s|--[^\n]*\n|\/\*[\s\S]*?\*\/|\()+/g, '');
  return (/^[a-z]+/i.exec(cleaned)?.[0] ?? '').toUpperCase();
}

export function statementKind(verb: string): StatementKind {
  switch (verb) {
    case 'SELECT':
    case 'WITH':
    case 'SHOW':
    case 'EXPLAIN':
    case 'DESCRIBE':
    case 'PRAGMA':
      return 'read';
    case 'INSERT':
    case 'UPDATE':
    case 'MERGE':
    case 'REPLACE':
      return 'write';
    case 'DELETE':
    case 'DROP':
    case 'TRUNCATE':
      return 'danger';
    case 'CREATE':
    case 'ALTER':
    case 'GRANT':
    case 'REVOKE':
      return 'ddl';
    default:
      return 'other';
  }
}

const parse = (value: string): Date | null => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export function dayLabel(value: string, now = new Date()): string {
  const d = parse(value);
  if (!d) return value.slice(0, 10);
  const start = (x: Date): number => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(now) - start(d)) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
}

export function timeLabel(value: string): string {
  const d = parse(value);
  return d ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : value;
}

/** Newest first, with a header row per day. */
export function groupByDay(items: HistoryType[]): HistoryRow[] {
  const rows: HistoryRow[] = [];
  let current: Extract<HistoryRow, { kind: 'day' }> | null = null;
  for (const history of items) {
    const label = dayLabel(history.createdAt);
    if (!current || current.label !== label) {
      current = { kind: 'day', key: `day:${label}:${history.id}`, label, count: 0 };
      rows.push(current);
    }
    current.count += 1;
    rows.push({ kind: 'item', key: String(history.id), history });
  }
  return rows;
}
