import { ColumnType, RowType } from '@/src/types/Data';

export type DataStore = object;

export type DataRowsType = {
  [key: string]: RowType[];
};

export type DataColumnsType = {
  [key: string]: ColumnType[];
};

export type DataSelectedRowType = {
  [key: string]: RowType | undefined;
};

export type DataRowSlice = {
  selectedRow: DataSelectedRowType;
  rows: DataRowsType;
  getRows(): RowType[];
  updateRows: (items: RowType[]) => Promise<void>;
  getSelectedRow(): RowType | undefined;
  updateSelectedRow: (selectedRow: RowType | undefined) => void;
  addEmptyRow: () => void;
};

export type DataColumnSlice = {
  columns: DataColumnsType;
  getColumns(withSelect?: boolean): ColumnType[];
  updateColumns: (items: ColumnType[]) => Promise<void>;
};

export type DataQuerySlice = {
  runQuery: () => Promise<void>;
};
