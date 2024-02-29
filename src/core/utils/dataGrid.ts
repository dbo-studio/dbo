import { ColumnType } from '@/src/types';
import { SelectColumn, textEditor } from 'react-data-grid';

export const formatServerColumns = (serverColumns: ColumnType[]): any => {
  const arr: ColumnType[] = [
    {
      ...SelectColumn,
      key: 'key',
      name: 'name',
      type: 'type',
      resizable: true,
      isActive: true,
      renderEditCell: textEditor,
      notNull: false,
      length: 'null',
      decimal: 0,
      default: 'null'
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
      decimal: column.decimal,
      default: column.default ?? 'null'
    });
  });

  return arr;
};
