import { ColumnType } from '@/src/types';
import { textEditor } from 'react-data-grid';

export const formatServerColumns = (serverColumns: ColumnType[]): any => {
  const arr: ColumnType[] = [];
  serverColumns!.forEach((column: ColumnType) => {
    arr.push({
      key: column.name,
      name: column.name,
      type: column.type,
      resizable: true,
      isActive: true,
      renderEditCell: textEditor
    });
  });

  return arr;
};
