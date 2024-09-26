import type { EditedRow } from '@/types';
import type { ColumnType, EditedColumnType, RowType } from '@/types/Data';

export type DataStore = object;

export type DataRowSlice = {
  rows: DataRowsType;
  getRows(): RowType[];
  updateRows: (items: RowType[]) => Promise<void>;
  removeRowsByTabId: (tabId: string) => void;
};

export type DataHighlightedRowSlice = {
  highlightedRow: DataHighlightedRowType; // when click on a row
  getHighlightedRow(): RowType | undefined;
  updateHighlightedRow(selectedRow: RowType | undefined): RowType | undefined;
  removeHighlightedRowsByTabId: (tabId: string) => void;
};

export type DataSelectedRowsSlice = {
  selectedRows: DataSelectedRowType; // when check a row in data grid
  getSelectedRows: any;
  updateSelectedRows(selectedRows: any): void;
  removeSelectedRows(selectedRowIndex: number[]): void;
};

export type DataColumnSlice = {
  columns: DataColumnsType;
  getColumns(withSelect?: boolean, isActive?: boolean): ColumnType[];
  updateColumns: (columns: ColumnType[]) => Promise<void>;
  updateColumn: (column: ColumnType) => Promise<void>;
  removeColumnsByTabId: (tabId: string) => void;
};

export type DataEditedColumnSlice = {
  editedColumns: DataEditedColumnsType;
  getEditedColumns(): EditedColumnType[];
  updateEditedColumns: (columns: EditedColumnType[]) => Promise<void>;
  addEditedColumns: (oldValue: ColumnType, newValue: ColumnType | EditedColumnType) => Promise<void>;
  updateRemovedColumns: () => Promise<void>;
  restoreEditedColumns: () => Promise<void>;
  addEmptyEditedColumns: () => Promise<void>;
  removeEditedColumnsByTabId: (tabId: string) => void;
};

export type DataEditedRowsSlice = {
  editedRows: DataEditedRowsType;
  getEditedRows(): EditedRow[];
  updateEditedRows: (rows: EditedRow[]) => void;
  restoreEditedRows: () => Promise<void>;
  removeEditedRowsByTabId: (tabId: string) => void;
};

export type DataRemovedRowsSlice = {
  removedRows: DataRemovedRowsType;
  getRemovedRows(): RowType[];
  updateRemovedRows(): void;
  deleteRemovedRowsByTabId: (tabId: string) => void;
};

export type DataUnsavedRowsSlice = {
  unSavedRows: DataRowsType;
  getUnsavedRows(): RowType[];
  addUnsavedRows(newRow?: RowType): void;
  updateUnsavedRows(unSavedRows: RowType[]): void;
  discardUnsavedRows(rows?: RowType[]): void;
  removeUnsavedRowsByTabId: (tabId: string) => void;
};

export type DataQuerySlice = {
  loading: boolean;
  runQuery: () => Promise<void>;
  runRawQuery: () => Promise<void>;
  updateDesignsQuery: () => Promise<void>;
};

export type DataRowsType = {
  [key: string]: RowType[];
};

export type DataColumnsType = {
  [key: string]: ColumnType[];
};

export type DataEditedColumnsType = {
  [key: string]: EditedColumnType[];
};

export type DataEditedRowsType = {
  [key: string]: EditedRow[];
};

export type DataRemovedRowsType = {
  [key: string]: RowType[];
};

export type DataHighlightedRowType = {
  [key: string]: RowType | undefined;
};

export type DataSelectedRowType = {
  [key: string]: any;
};
