import { UpdateDesignItemType } from '@/src/api/design/types';
import { ColumnType, EditedColumnType, EditedColumnValue, EditedRow, RowType } from '@/src/types';
import { updatedDiff } from 'deep-object-diff';
import { has } from 'lodash';
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
      // renderEditCell: textEditor,
      notNull: false,
      length: 'null',
      comment: 'null',
      default: 'null',
      mappedType: 'string',
      editable: false,
      maxWidth: 400,
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
      maxWidth: 400,
      name: column.name,
      type: column.type,
      resizable: true,
      isActive: true,
      renderEditCell: column.editable ? textEditor : null,
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

  //for keeping original value we update oldObject once
  if (!oldObject[diffKey]) {
    oldObject[diffKey] = oldValue[diffKey];
  }
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
  oldValue: EditedColumnType,
  newValue: EditedColumnType
) => {
  //check if edited value exists in editedColumns just update this values
  const findValueIndex = editedColumns.findIndex((x) => x.key == oldValue.key);
  const findValue = editedColumns[findValueIndex];

  //the old value and new value always contain one diff key so we pick first item
  const diff = updatedDiff(oldValue, newValue);
  const diffKey = Object.keys(diff)[0];

  if (findValue && findValue.unsaved) {
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

  if (Object.keys(diff).length == 0) {
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
    renderEditCell: textEditor,
    resizable: true,
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
    newObject['name'] = data.name;
  }

  if (has(data, 'type')) {
    newObject['type'] = data.type;
  }

  if (has(data, 'length')) {
    newObject['length'] = Number(data.length);
  }

  if (has(data, 'default')) {
    newObject['default'] = {
      make_null: false,
      make_empty: false,
      value: data.default ?? ''
    };
  }

  if (has(data, 'notNull')) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    newObject['is_null'] = !data.notNull;
  }

  if (has(data, 'comment')) {
    newObject['comment'] = data.comment;
  }

  console.log(newObject);

  return newObject;
};
