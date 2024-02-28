import { TabType } from '@/src/types';
import { ColumnType, RowType } from '@/src/types/Data';

export type DataStore = {
  selectedRow: DataSelectedRowType;
  rows: DataRowsType;
  columns: DataColumnsType;
  getRows(): RowType[];
  getColumns(): ColumnType[];
  getSelectedRow(): RowType | undefined;
  updateSelectedRow: (selectedRow: RowType | undefined) => void;
  updateRows: (items: RowType[]) => Promise<void>;
  updateColumns: (items: RowType[]) => Promise<void>;
  selectedTab: () => TabType | undefined;
  runQuery: () => Promise<void>;
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
