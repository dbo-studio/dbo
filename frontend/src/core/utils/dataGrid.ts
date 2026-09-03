import type { ColumnType, EditedRow, RowType } from '@/types';

/** Parsed boolean cell: true / false / SQL NULL. */
export type BooleanCellState = true | false | null;

export const parseBooleanCellValue = (value: unknown): BooleanCellState => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (value === true || value === 'true' || value === 't' || value === 'T' || value === 1 || value === '1') {
    return true;
  }
  if (value === false || value === 'false' || value === 'f' || value === 'F' || value === 0 || value === '0') {
    return false;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value === 0 ? false : true;
  }
  return null;
};

/**
 * Cycle checkbox values: null → true → false → null.
 * Always includes NULL so click matches context-menu Set NULL (DB may still reject NOT NULL on save).
 */
export const nextBooleanCellValue = (current: unknown): BooleanCellState => {
  const state = parseBooleanCellValue(current);
  if (state === null) {
    return true;
  }
  if (state === true) {
    return false;
  }
  return null;
};

export const valuesSemanticallyEqual = (previous: unknown, next: unknown): boolean => {
  if (Object.is(previous, next)) {
    return true;
  }

  if (previous === null || previous === undefined) {
    return next === null || next === undefined || next === '';
  }

  if (next === null || next === undefined || next === '') {
    return previous === null || previous === undefined || previous === '';
  }

  if (
    typeof previous === 'object' &&
    previous !== null &&
    typeof next === 'object' &&
    next !== null &&
    '__dbo' in previous &&
    '__dbo' in next &&
    (previous as { __dbo?: string }).__dbo === 'binary' &&
    (next as { __dbo?: string }).__dbo === 'binary'
  ) {
    const a = previous as { length?: number; base64?: string };
    const b = next as { length?: number; base64?: string };
    return a.length === b.length && a.base64 === b.base64;
  }

  // Booleans and common DB encodings (t/f, true/false). null already handled above.
  if (
    typeof previous === 'boolean' ||
    typeof next === 'boolean' ||
    previous === 't' ||
    previous === 'f' ||
    previous === 'true' ||
    previous === 'false' ||
    next === 't' ||
    next === 'f' ||
    next === 'true' ||
    next === 'false'
  ) {
    return parseBooleanCellValue(previous) === parseBooleanCellValue(next);
  }

  if (typeof previous === 'number' || typeof next === 'number') {
    const prevNum = Number(previous);
    const nextNum = Number(next);
    return Number.isFinite(prevNum) && Number.isFinite(nextNum) && prevNum === nextNum;
  }

  if (
    (typeof previous === 'string' || typeof previous === 'number' || typeof previous === 'bigint') &&
    (typeof next === 'string' || typeof next === 'number' || typeof next === 'bigint')
  ) {
    return String(previous) === String(next);
  }

  return false;
};

export const buildRowConditions = (row: RowType, columns: ColumnType[]): object => {
  const pkColumns = columns.filter((column) => column.isPrimaryKey);
  if (pkColumns.length === 0) {
    return row;
  }

  const conditions: Record<string, unknown> = {};
  for (const pkColumn of pkColumns) {
    const physicalKey = pkColumn.sourceColumn ?? pkColumn.name;
    conditions[physicalKey] = row[pkColumn.name];
  }

  return conditions;
};

export const mapRowValuesToPhysical = (values: RowType, columns: ColumnType[]): Record<string, unknown> => {
  const mapped: Record<string, unknown> = {};

  for (const [outputName, value] of Object.entries(values)) {
    if (outputName === 'dbo_index') {
      continue;
    }

    const column = columns.find((item) => item.name === outputName);
    const physicalKey = column?.sourceColumn ?? outputName;
    mapped[physicalKey] = value;
  }

  return mapped;
};

const hasEditedFields = (values: RowType): boolean => Object.keys(values).some((key) => key !== 'dbo_index');

export const handleRowChangeLog = (
  editedRows: EditedRow[],
  oldRow: RowType,
  rowKey: string,
  oldValue: unknown,
  newValue: unknown,
  columns: ColumnType[]
): EditedRow[] => {
  const dboIndex = oldRow.dbo_index;
  const existingRowIndex = editedRows.findIndex((row) => row.dboIndex === dboIndex);
  const existingRow = existingRowIndex !== -1 ? editedRows[existingRowIndex] : null;

  const oldObject: RowType = existingRow ? { ...existingRow.old } : { dbo_index: dboIndex };
  const newObject: RowType = existingRow ? { ...existingRow.new } : { dbo_index: dboIndex };

  // Keep the first original value for this field; only update the new value.
  if (!(rowKey in oldObject)) {
    oldObject[rowKey] = oldValue;
  }
  newObject[rowKey] = newValue;

  if (valuesSemanticallyEqual(oldObject[rowKey], newObject[rowKey])) {
    delete oldObject[rowKey];
    delete newObject[rowKey];
  }

  const next = [...editedRows];

  if (!hasEditedFields(newObject)) {
    if (existingRowIndex !== -1) {
      next.splice(existingRowIndex, 1);
    }
    return next;
  }

  const updatedRow: EditedRow = {
    dboIndex,
    conditions: buildRowConditions(oldRow, columns),
    old: oldObject,
    new: newObject
  };

  if (existingRowIndex === -1) {
    next.push(updatedRow);
  } else {
    next[existingRowIndex] = updatedRow;
  }

  return next;
};

export const createEmptyRow = (columns: ColumnType[]): RowType => {
  const newRow: RowType = {
    dbo_index: 0
  };
  for (const column of columns) {
    if (!column.notNull) {
      newRow[column.name] = null;
    } else {
      switch (column.mappedType) {
        case 'boolean':
          newRow[column.name] = false;
          break;
        case 'number':
          newRow[column.name] = 0;
          break;
        case 'binary':
          newRow[column.name] = { __dbo: 'binary', length: 0 };
          break;
        case 'json':
          newRow[column.name] = '{}';
          break;
        default:
          newRow[column.name] = '';
          break;
      }
    }
  }

  return newRow;
};
