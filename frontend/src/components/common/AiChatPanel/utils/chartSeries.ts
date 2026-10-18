const MAX_POINTS = 50;
const MAX_SERIES = 3;

export type ChartSeries = { labelKey: string; valueKeys: string[] };

/** Keys are numbers too, but plotting them says nothing. */
const IDENTIFIER = /(^|_)id$/i;

const isNumber = (value: unknown): boolean => typeof value === 'number' && Number.isFinite(value);

/**
 * Picks what to plot from an aggregate result: the first column that is not
 * a measure labels the bars and every numeric non-id column is a series. Anything that
 * is not "a few labelled numbers" has no chart.
 */
export const chartSeries = (rows: Record<string, unknown>[], columns: string[]): ChartSeries | null => {
  if (rows.length < 2 || rows.length > MAX_POINTS) return null;

  const numeric = columns.filter((column) => {
    if (IDENTIFIER.test(column)) return false;
    const values = rows.map((row) => row[column]).filter((value) => value !== null && value !== undefined);
    return values.length > 0 && values.every(isNumber);
  });
  const labelKey = columns.find((column) => !numeric.includes(column));
  if (!labelKey || numeric.length === 0) return null;

  return { labelKey, valueKeys: numeric.slice(0, MAX_SERIES) };
};
