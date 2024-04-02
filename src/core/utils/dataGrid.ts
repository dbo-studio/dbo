import { ColumnType, EditedColumnType, EditedRow, RowType } from '@/src/types';
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
      mappedType: 'string',
      editMode: {
        name: false,
        default: false,
        length: false,
        comment: false
      }
    }
  ];
  serverColumns!.forEach((column: ColumnType) => {
    arr.push({
      key: column.key,
      name: column.name,
      type: column.type,
      resizable: true,
      isActive: true,
      renderEditCell: textEditor,
      notNull: column.notNull,
      length: column.length ?? 'null',
      comment: column.comment ?? 'null',
      default: column.default ?? 'null',
      mappedType: column.mappedType,
      selected: column.selected ?? false,
      editMode: column.editMode ?? {
        name: false,
        default: false,
        length: false,
        comment: false
      }
    });
  });

  return arr;
};

export const handelRowChangeLog = (editedRows: EditedRow[], oldValue: RowType, newValue: RowType): EditedRow[] => {
  const dboIndex = oldValue.dbo_index;

  //check if edited value exists in editedRows just update this values
  const findValueIndex = editedRows.findIndex((x) => x.dboIndex == dboIndex);
  const findValue = editedRows[findValueIndex];

  //the old value and new value always contain one diff key so we pick first item
  const diff = updatedDiff(oldValue, newValue);
  const diffKey = Object.keys(diff)[0];

  const oldObject: RowType = findValue ? findValue.old : {};
  const newObject: RowType = findValue ? findValue.new : {};
  oldObject[diffKey] = oldValue[diffKey];
  newObject[diffKey] = newValue[diffKey];

  let conditions: object = {};
  if (Object.prototype.hasOwnProperty.call(oldValue, 'id')) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    conditions['id'] = oldValue.id;
  } else {
    conditions = oldValue;
  }

  if (!findValue) {
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

export const handelColumnChangeLog = (
  editedColumns: EditedColumnType[],
  oldValue: ColumnType,
  newValue: ColumnType
) => {
  //check if edited value exists in editedColumns just update this values
  const findValueIndex = editedColumns.findIndex((x) => x.key == oldValue.key);
  const findValue = editedColumns[findValueIndex];

  //the old value and new value always contain one diff key so we pick first item
  const diff = updatedDiff(oldValue, newValue);

  const diffKey = Object.keys(diff)[0];

  const oldObject: EditedColumnType = findValue ? findValue.old : {};
  const newObject: EditedColumnType = findValue ? findValue.new : {};
  oldObject[diffKey] = oldValue[diffKey];
  newObject[diffKey] = newValue[diffKey];

  if (Object.keys(diff).length > 0) {
    newValue.edited = true;
  }

  if (!findValue) {
    editedColumns.push({
      ...newValue,
      old: oldObject,
      new: newObject
    });
  } else {
    editedColumns[findValueIndex] = {
      ...newValue,
      old: oldObject,
      new: newObject
    };
  }

  return editedColumns;
};
