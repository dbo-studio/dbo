import { TabType } from '@/src/types';
import { ColumnType, RowType } from '@/src/types/Data';

export type DataStore = {
  selectedRow: DataSelectedRowType;
  rows: DataRowsType;
  columns: DataColumnsType;
  getRows(): RowType[];
  getColumns(): ColumnType[];
  getSelectedRow(): RowType | undefined;
  updateSelectedRow: (selectedRow: any | undefined) => void;
  updateRows: (items: any[]) => void;
  updateColumns: (items: any[]) => void;
  selectedTab: () => TabType | undefined;
};

export type DataRowsType = {
  [key: string]: RowType[];
};

export type DataColumnsType = {
  [key: string]: ColumnType[];
};

export type DataSelectedRowType = {
  [key: string]: RowType | undefined;
};
