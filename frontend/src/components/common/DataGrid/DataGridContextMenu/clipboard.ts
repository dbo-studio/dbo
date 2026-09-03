import type { ColumnType, RowType } from '@/types';

const cellToString = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }
  return '';
};

const escapeCsvField = (value: string): string => {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

/** Serialize a row for clipboard as TSV or CSV using active data columns. */
export function serializeRowForClipboard(row: RowType, columns: ColumnType[], format: 'tsv' | 'csv'): string {
  const dataColumns = columns.filter((c) => c.name !== 'select' && c.isActive !== false);
  const values = dataColumns.map((c) => cellToString(row[c.name]));
  if (format === 'tsv') {
    return values.join('\t');
  }
  return values.map(escapeCsvField).join(',');
}

export function cellValueForFilter(value: unknown): string {
  return cellToString(value);
}
