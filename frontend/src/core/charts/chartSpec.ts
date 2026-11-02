export const CHART_TYPES = [
  'table',
  'number',
  'bar',
  'row',
  'line',
  'area',
  'pie',
  'combo',
  'scatter',
  'funnel',
  'gauge',
  'heatmap',
  'pivot',
  'trend'
] as const;

export type ChartType = (typeof CHART_TYPES)[number];

/** How to draw a result. The same shape is saved with a report, so keep it plain data. */
export type ChartSpec = {
  type: ChartType;
  /** Column for the categories or the time axis. */
  x?: string;
  /** Measure columns, one series each. */
  y: string[];
  stacked?: boolean;
  /** Second dimension of a heatmap or pivot. */
  group?: string;
  /** Number column that sizes scatter bubbles. */
  size?: string;
  /** What a gauge's value is measured against. */
  goal?: number;
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
    for (const key of [...spec.y, ...(spec.size ? [spec.size] : [])]) next[key] = Number(row[key]);
    // A scatter plots numbers on both axes.
    if (spec.type === 'scatter' && spec.x) next[spec.x] = Number(row[spec.x]);
    return next;
  });

/** Rows pivoted: one row per `x`, one column per `group`, each cell the sum of `value` (cells with no data stay empty). */
export function pivotRows(
  rows: Record<string, unknown>[],
  x: string,
  group: string,
  value: string
): { columns: string[]; rows: Record<string, unknown>[] } {
  const groups: string[] = [];
  const byX = new Map<string, Record<string, unknown>>();

  for (const row of rows) {
    const key = asText(row[x]);
    const g = asText(row[group]);
    if (!groups.includes(g)) groups.push(g);

    const line = byX.get(key) ?? { [x]: row[x] };
    line[g] = Number(line[g] ?? 0) + Number(row[value]);
    byX.set(key, line);
  }

  return { columns: [x, ...groups], rows: [...byX.values()] };
}

/** The latest value of a series and how it moved from the one before (null when there is nothing to compare). */
export function trendOf(
  rows: Record<string, unknown>[],
  value: string
): { current: number; previous: number | null; change: number | null } {
  const current = Number(rows[rows.length - 1]?.[value]);
  const previousRow = rows.length > 1 ? rows[rows.length - 2] : undefined;
  const previous = previousRow ? Number(previousRow[value]) : null;
  const change = previous === null || previous === 0 ? null : ((current - previous) / Math.abs(previous)) * 100;

  return { current, previous, change };
}

const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });
const full = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

export const formatAxisNumber = (value: unknown): string =>
  isNumeric(value) ? compact.format(Number(value)) : asText(value);
export const formatNumber = (value: unknown): string => (isNumeric(value) ? full.format(Number(value)) : asText(value));

const PARAM =
  /\{\{\s*([A-Za-z_]\w*)\s*(?::\s*([a-z]+)\s*(?:=\s*([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)?)\s*)?)?\}\}/g;

/** A {{filter}} in a report's SQL: {{name}}, {{name:type}} or {{name:field=table.column}}. */
export type QuestionParam = {
  name: string;
  type: '' | 'text' | 'number' | 'date' | 'boolean' | 'range' | 'field';
  field?: string;
};

/** The {{filters}} of a report's SQL, in order, each name once (its first use wins). The backend reads them the same way. */
export const questionParams = (sql: string): QuestionParam[] => {
  const seen = new Map<string, QuestionParam>();
  for (const [, name, type, field] of sql.matchAll(PARAM)) {
    if (!seen.has(name)) seen.set(name, { name, type: (type ?? '') as QuestionParam['type'], field });
  }

  return [...seen.values()];
};

/** Filters that block a run while empty; an empty field filter just matches every row. */
export const missingParams = (params: QuestionParam[], values: Record<string, string>): string[] =>
  params.filter((param) => param.type !== 'field' && !values[param.name]).map((param) => param.name);
