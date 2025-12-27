import type { ColumnType, EditedRow, RowType } from '@/types';

export const handleRowChangeLog = (
  editedRows: EditedRow[],
  oldRow: RowType,
  rowKey: string,
  oldValue: unknown,
  newValue: unknown
): EditedRow[] => {
  const dboIndex = oldRow.dbo_index;

  //check if edited value exists in editedRows just update this values
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

  const conditions = oldRow?.id ? { id: oldRow.id } : oldRow;

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
