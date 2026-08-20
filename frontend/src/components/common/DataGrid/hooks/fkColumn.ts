import type { ColumnType } from '@/types';

export function getFkReferencedColumns(column?: ColumnType): string[] {
  if (!column?.referencedColumns?.length) {
    return [];
  }

  return column.referencedColumns;
}

export function getFkLocalColumns(column?: ColumnType): string[] {
  if (!column) {
    return [];
  }

  if (column.localColumns?.length) {
    return column.localColumns;
  }

  const refs = getFkReferencedColumns(column);
  if (refs.length === 1) {
    return [column.name];
  }

  return [];
}

export function isForeignKeyPickerColumn(column?: ColumnType): boolean {
  return Boolean(column?.isForeignKey && column.referencedTable && getFkReferencedColumns(column).length > 0);
}

export function isSingleColumnForeignKey(column?: ColumnType): boolean {
  return isForeignKeyPickerColumn(column) && getFkReferencedColumns(column).length === 1;
}

export function isCompositeForeignKey(column?: ColumnType): boolean {
  return isForeignKeyPickerColumn(column) && getFkReferencedColumns(column).length > 1;
}

/** True when every local FK part allows NULL (or unknown local metadata falls back to this column). */
export function canSetFkNull(column: ColumnType, allColumns: ColumnType[]): boolean {
  const localColumns = getFkLocalColumns(column);
  if (localColumns.length === 0) {
    return !column.notNull;
  }

  return localColumns.every((name) => {
    const match = allColumns.find((item) => item.name === name);
    return match ? !match.notNull : !column.notNull;
  });
}

export function coerceFkCellValue(raw: unknown, mappedType?: string): unknown {
  if (raw === null || raw === undefined) {
    return null;
  }

  if (mappedType === 'number') {
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return raw;
    }

    if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
      const asNumber = Number(String(raw).trim());
      if (Number.isFinite(asNumber) && String(raw).trim() !== '') {
        return asNumber;
      }
    }
  }

  if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
    return String(raw);
  }

  return raw;
}
