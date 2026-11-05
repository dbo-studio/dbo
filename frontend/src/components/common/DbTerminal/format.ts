import type { CliResult } from '@/api/cli/types';
import locales from '@/locales';

export const ESC = '\u001b[';
export const red = (s: string): string => `${ESC}31m${s}${ESC}0m`;
export const cyan = (s: string): string => `${ESC}36m${s}${ESC}0m`;
export const dim = (s: string): string => `${ESC}2m${s}${ESC}0m`;
export const bold = (s: string): string => `${ESC}1m${s}${ESC}0m`;

/**
 * Database values are untrusted: a cell holding an escape sequence could move the cursor, rewrite earlier lines or
 * set the terminal title. Everything that came from the server is stripped of control characters before it is
 * written; only the escape codes this file adds itself reach the terminal.
 */
export function sanitize(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g, '�');
}

const CELL_MAX = 60;

function cell(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  const text = typeof v === 'string' ? v : JSON.stringify(v);
  const flat = sanitize(text.replace(/[\r\n\t]+/g, ' '));
  return flat.length > CELL_MAX ? `${flat.slice(0, CELL_MAX - 1)}…` : flat;
}

/** psql-like aligned table. */
function table(columns: string[], rows: unknown[][]): string[] {
  const cells = rows.map((r) => r.map(cell));
  const heads = columns.map(sanitize);
  const widths = heads.map((h, i) => Math.max(h.length, ...cells.map((r) => (r[i] ?? '').length)));
  const line = (r: string[]): string => r.map((c, i) => c.padEnd(widths[i])).join(' | ');

  return [bold(line(heads)), widths.map((w) => '-'.repeat(w)).join('-+-'), ...cells.map(line)];
}

/** redis-cli style rendering of a reply: numbered arrays, quoted strings, (nil). */
export function formatValue(v: unknown, indent = ''): string {
  if (v === null || v === undefined) return '(nil)';
  if (typeof v === 'number') return `(integer) ${v}`;
  if (typeof v === 'string') return sanitize(JSON.stringify(v));
  if (Array.isArray(v)) {
    if (v.length === 0) return '(empty array)';
    return v.map((e, i) => `${i === 0 ? '' : indent}${i + 1}) ${formatValue(e, `${indent}   `)}`).join('\n');
  }
  if (typeof v === 'object') {
    return Object.entries(v as Record<string, unknown>)
      .map(([k, e], i) => `${i === 0 ? '' : indent}${sanitize(JSON.stringify(k))} => ${formatValue(e, `${indent}  `)}`)
      .join('\n');
  }
  return sanitize(JSON.stringify(v));
}

/** Lines to print for a result; the terminal joins them with CRLF. */
export function formatResult(res: CliResult): string[] {
  if (res.kind === 'value') return formatValue(res.output).split('\n');

  if (!res.columns?.length) return [dim('OK')];

  const lines = table(res.columns, res.rows ?? []);
  const footer = res.truncated
    ? locales.cli_more_rows.replace('{count}', String(res.rowCount))
    : res.rowCount === 1
      ? locales.cli_row_one
      : locales.cli_rows.replace('{count}', String(res.rowCount));

  return [...lines, dim(`(${footer})`)];
}
