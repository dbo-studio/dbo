export const CHART_TYPES = ['table', 'number', 'bar', 'row', 'line', 'area', 'pie'] as const;

export type ChartType = (typeof CHART_TYPES)[number];

/** How to draw a result. The same shape is saved with a report, so keep it plain data. */
export type ChartSpec = {
  type: ChartType;
  /** Column for the categories or the time axis. */
  x?: string;
  /** Measure columns, one series each. */
  y: string[];
  stacked?: boolean;
};

/** Points beyond this are cut, with a note: SVG charts slow down and stop being readable. */
export const MAX_CHART_POINTS = 500;

const IDENTIFIER = /(^|_)id$/i;
const DATE_NAME = /(date|time|day|week|month|year|_at)$/i;
const ISO_DATE = /^\d{4}-\d{2}(-\d{2})?([ T].*)?$/;

const isNumeric = (value: unknown): boolean =>
  (typeof value === 'number' && Number.isFinite(value)) ||
  (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)));

/** Columns whose every value is a number (drivers send some as strings), ids excluded. */
export const numericColumns = (rows: Record<string, unknown>[], columns: string[]): string[] =>
  columns.filter((column) => {
    if (IDENTIFIER.test(column)) return false;
    const values = rows.map((row) => row[column]).filter((value) => value !== null && value !== undefined);
    return values.length > 0 && values.every(isNumeric);
  });

const asText = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : '';

const isTimeColumn = (rows: Record<string, unknown>[], column: string): boolean =>
  DATE_NAME.test(column) || rows.slice(0, 5).every((row) => ISO_DATE.test(asText(row[column])));

/**
 * A sensible chart for a result: one number is a KPI, a time column with measures
 * is a line, a few categories with measures are bars, anything else stays a table.
 */
export function autoChart(rows: Record<string, unknown>[], columns: string[]): ChartSpec {
  const measures = numericColumns(rows, columns);
  if (rows.length === 1 && measures.length >= 1 && columns.length <= 2) return { type: 'number', y: [measures[0]] };

  const x = columns.find((column) => !measures.includes(column));
  if (!x || measures.length === 0 || rows.length < 2) return { type: 'table', y: [] };

  return { type: isTimeColumn(rows, x) ? 'line' : 'bar', x, y: measures.slice(0, 4) };
}

/** Values as numbers for plotting; drivers send big integers and decimals as strings. */
export const toPlotRows = (rows: Record<string, unknown>[], spec: ChartSpec): Record<string, unknown>[] =>
  rows.slice(0, MAX_CHART_POINTS).map((row) => {
    const next: Record<string, unknown> = { ...row };
    for (const key of spec.y) next[key] = Number(row[key]);
    return next;
  });

const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });
const full = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

export const formatAxisNumber = (value: unknown): string =>
  isNumeric(value) ? compact.format(Number(value)) : asText(value);
export const formatNumber = (value: unknown): string => (isNumeric(value) ? full.format(Number(value)) : asText(value));

const PARAM = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;

/** Names of the {{name}} filters in a report's SQL, in order, each once. The backend fills them the same way. */
export const questionParams = (sql: string): string[] => [...new Set([...sql.matchAll(PARAM)].map((match) => match[1]))];
