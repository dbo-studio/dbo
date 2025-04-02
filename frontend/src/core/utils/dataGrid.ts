import type { ColumnType, EditedRow, RowType } from '@/types';

export const handelRowChangeLog = (
  editedRows: EditedRow[],
  oldRow: RowType,
  rowKey: string,
  oldValue: any,
  newValue: any
): EditedRow[] => {
  const dboIndex = oldRow.dbo_index;

  //check if edited value exists in editedRows just update this values
  const findValueIndex = editedRows.findIndex((x) => x.dboIndex === dboIndex);
  const findValue = editedRows[findValueIndex];

  const oldObject: RowType = findValue ? findValue.old : {};
  const newObject: RowType = findValue ? findValue.new : {};

  oldObject[rowKey] = oldValue;
  newObject[rowKey] = newValue;

  let conditions: any = {};
  if (oldRow?.id) {
    conditions.id = oldRow?.id;
  } else {
    conditions = oldRow;
  }

  if (findValueIndex === -1) {
    editedRows.push({
      dboIndex: dboIndex,
      conditions: conditions,
      old: oldObject,
      new: newObject
    });
  } else {
    editedRows[findValueIndex] = {
      dboIndex: dboIndex,
      conditions: conditions,
      old: oldObject,
      new: newObject
    };
  }

  return editedRows;
};

export const createEmptyRow = (columns: ColumnType[]): RowType => {
  const newRow: RowType = {};
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
