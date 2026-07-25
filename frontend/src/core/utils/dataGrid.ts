import type { ColumnType, EditedRow, RowType } from '@/types';

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

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const oldObject: RowType = existingRow ? existingRow.old : { dbo_index: 0 };
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const newObject: RowType = existingRow ? existingRow.new : {};

  oldObject[rowKey] = oldValue;
  newObject[rowKey] = newValue;

  const conditions = buildRowConditions(oldRow, columns);

  const updatedRow: EditedRow = {
    dboIndex,
    conditions,
    old: oldObject,
    new: newObject
  };

  if (existingRowIndex === -1) {
    editedRows.push(updatedRow);
  } else {
    editedRows[existingRowIndex] = updatedRow;
  }

  return editedRows;
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
        default:
          newRow[column.name] = '';
          break;
      }
    }
  }

  return newRow;
};
