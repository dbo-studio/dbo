import { ColumnType, EditedRow, RowType } from '@/src/types';
import { updatedDiff } from 'deep-object-diff';
import { SelectColumn, textEditor } from 'react-data-grid';

export const formatServerColumns = (serverColumns: ColumnType[]): any => {
  const arr: ColumnType[] = [
    {
      ...SelectColumn,
      key: 'select-row',
      name: 'name',
      type: 'type',
      resizable: true,
      isActive: true,
      renderEditCell: textEditor,
      notNull: false,
      length: 'null',
      comment: 'null',
      default: 'null',
      mappedType: 'string'
    }
  ];
  serverColumns!.forEach((column: ColumnType) => {
    arr.push({
      key: column.name,
      name: column.name,
      type: column.type,
      resizable: true,
      isActive: true,
      renderEditCell: textEditor,
      notNull: column.notNull,
      length: column.length ?? 'null',
      comment: column.comment ?? 'null',
      default: column.default ?? 'null',
      mappedType: column.mappedType
    });
  });

  return arr;
};

export const handelRowChangeLog = (editedRows: EditedRow[], oldValue: RowType, newValue: RowType): EditedRow[] => {
  const findValueIndex = editedRows.findIndex((x) => x.dboIndex == newValue.dbo_index);
  const findValue = editedRows[findValueIndex];
  const diff = updatedDiff(oldValue, newValue);
  const diffKey = Object.keys(diff)[0];
  let o: RowType = {};
  let n: RowType = {};

  if (!findValue) {
    o[diffKey] = oldValue[diffKey];
    n[diffKey] = newValue[diffKey];
    editedRows.push({
      dboIndex: newValue.dbo_index,
      id: n.id,
      old: o,
      new: n
    });
  } else {
    o = findValue.old;
    n = findValue.new;
    o[diffKey] = oldValue[diffKey];
    n[diffKey] = newValue[diffKey];
    editedRows[findValueIndex] = {
      dboIndex: newValue.dbo_index,
      id: n.id,
      old: o,
      new: n
    };
  }

  return editedRows;
};

export const createEmptyRow = (columns: ColumnType[]): RowType => {
  const newRow: RowType = {};
  columns.forEach((column) => {
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
  });

  return newRow;
};
