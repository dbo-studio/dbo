/** One cell as text: null is empty, objects are JSON. */
export const formatCellValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
};

const csvCell = (value: string): string => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

export const toCsv = (columns: string[], rows: Record<string, unknown>[]): string =>
  [columns, ...rows.map((row) => columns.map((column) => formatCellValue(row[column])))]
    .map((cells) => cells.map(csvCell).join(','))
    .join('\n');
