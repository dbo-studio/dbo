import type { UpdateDesignItemType } from '@/api/design/types';
import type { ColumnType, EditedColumnType, EditedColumnValue, EditedRow, RowType } from '@/types';
import { updatedDiff } from 'deep-object-diff';
import { has } from 'lodash';

export const formatServerColumns = (serverColumns: ColumnType[]): any => {
  const arr: ColumnType[] = [];
  for (const column of serverColumns) {
    arr.push({
      key: column.key,
      name: column.name,
      type: column.type,
      editable: column.editable,
      isActive: column.isActive,
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
  }

  return arr;
};

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

export const handelColumnChangeLog = (
  editedColumns: EditedColumnType[],
  oldValue: EditedColumnType,
  newValue: EditedColumnType
) => {
  //check if edited value exists in editedColumns just update this values
  const findValueIndex = editedColumns.findIndex((x) => x.key === oldValue.key);
  const findValue = editedColumns[findValueIndex];

  //the old value and new value always contain one diff key so we pick first item
  const diff = updatedDiff(oldValue, newValue);
  const diffKey = Object.keys(diff)[0];

  if (findValue?.unsaved) {
    findValue.old = findValue?.old ?? diff;
    findValue.new = findValue?.new ?? diff;
  }

  const oldObject: Partial<EditedColumnType | undefined> = findValue ? findValue.old : {};
  const newObject: Partial<EditedColumnType | undefined> = findValue ? findValue.new : {};

  //for keeping original value we update oldObject once
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  if (!oldObject[diffKey]) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    oldObject[diffKey] = oldValue[diffKey];
  }
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  newObject[diffKey] = newValue[diffKey];

  if (Object.keys(diff).length === 0) {
    return editedColumns;
  }

  (newValue as EditedColumnType).edited = true;
  (newValue as EditedColumnType).unsaved = findValue?.unsaved ?? false;
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

export const createEmptyColumn = (): EditedColumnType => {
  return {
    key: 'new_column',
    name: '',
    type: 'varchar',
    isActive: false,
    notNull: true,
    length: '',
    comment: '',
    default: '',
    mappedType: 'string',
    selected: false,
    unsaved: true
  };
};

//this function remove null values from object and make it clean to sent to server
export const cleanupUpdateDesignObject = (data: EditedColumnValue | null): UpdateDesignItemType => {
  const newObject: UpdateDesignItemType = {};
  if (!data) {
    return newObject;
  }

  if (has(data, 'name')) {
    newObject.name = data.name;
  }

  if (has(data, 'type')) {
    newObject.type = data.type;
  }

  if (has(data, 'length')) {
    newObject.length = Number(data.length);
  }

  if (has(data, 'default')) {
    newObject.default = {
      make_null: false,
      make_empty: false,
      value: data.default ?? ''
    };
  }

  if (has(data, 'notNull')) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    newObject.is_null = !data.notNull;
  }

  if (has(data, 'comment')) {
    newObject.comment = data.comment;
  }

  return newObject;
};
