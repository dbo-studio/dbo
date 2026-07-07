import type { RunQueryResponseType } from '@/api/query/types';

const HIDDEN_COLUMNS = new Set(['dbo_index', 'editable']);

const formatCellForMarkdown = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
};

const escapeMarkdownCell = (value: unknown): string =>
  formatCellForMarkdown(value).replace(/\|/g, '\\|').replace(/\n/g, ' ');

const formatSampleRowsTable = (rows: Record<string, unknown>[], maxRows = 3): string => {
  if (rows.length === 0) {
    return '';
  }

  const columns = Object.keys(rows[0]).filter((key) => !HIDDEN_COLUMNS.has(key));
  if (columns.length === 0) {
    return '';
  }

  const sample = rows.slice(0, maxRows);
  const header = `| ${columns.join(' | ')} |`;
  const separator = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = sample
    .map((row) => `| ${columns.map((column) => escapeMarkdownCell(row[column])).join(' | ')} |`)
    .join('\n');

  return `${header}\n${separator}\n${body}`;
};

export function summarizeQueryResult(res: RunQueryResponseType): string {
  const columns = res.columns.map((c) => c.name).join(', ');
  const rowCount = res.data.length;
  const table = formatSampleRowsTable(res.data);

  return `${rowCount} row(s), columns: ${columns}${table ? `\nSample rows:\n${table}` : ''}`;
}
