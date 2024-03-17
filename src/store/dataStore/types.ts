import { EditedRow } from '@/src/types';
import { ColumnType, RowType } from '@/src/types/Data';

export type DataStore = object;

export type DataRowSlice = {
  rows: DataRowsType;
  getRows(): RowType[];
  updateRows: (items: RowType[]) => Promise<void>;
  addEmptyRow: () => void;
};

export type DataHightedRowSlice = {
  hightedRow: DataHightedRowType; // when click on a row
  getHightedRow(): RowType | undefined;
  updateHightedRow(selectedRow: RowType | undefined): RowType | undefined;
};

export type DataSelectedRowsSlice = {
  selectedRows: DataSelectedRowType; // when check a row in data grid
  getSelectedRows: any;
  updateSelectedRows(selectedRows: any): void;
};

export type DataColumnSlice = {
  columns: DataColumnsType;
  getColumns(withSelect?: boolean): ColumnType[];
  updateColumns: (items: ColumnType[]) => Promise<void>;
};

export type DataEditedRowsSlice = {
  editedRows: DataEditedRowsType;
  getEditedRows(): EditedRow[];
  updateEditedRows: (rows: EditedRow[]) => void;
};

export type DataRemovedRowsSlice = {
  removedRows: DataRemovedRowsType;
  getRemovedRows(): RowType[];
  updateRemovedRows(rowsIndex: number[]): void;
};

export type DataUnsavedRowsSlice = {
  unSavedRows: DataRowsType;
  getUnsavedRows(): RowType[];
  updateUnsavedRows(row: RowType): void;
  discardUnsavedRows(): void;
};

export type DataQuerySlice = {
  runQuery: () => Promise<void>;
  runRawQuery: () => Promise<void>;
};

export type DataRowsType = {
  [key: string]: RowType[];
};

export type DataColumnsType = {
  [key: string]: ColumnType[];
};

export type DataEditedRowsType = {
  [key: string]: EditedRow[];
};

export type DataRemovedRowsType = {
  [key: string]: RowType[];
};

export type DataHightedRowType = {
  [key: string]: RowType | undefined;
};

export type DataSelectedRowType = {
  [key: string]: any;
};
