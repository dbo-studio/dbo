import type { EditedRow } from '@/types';
import type { ColumnType, EditedColumnType, RowType } from '@/types/Data';

export type DataStore = object;

export type DataRowSlice = {
  rows: Record<string, RowType[]>;
  getRows: () => RowType[];
  getRow: (dboIndex: number) => RowType | null | undefined;
  updateRows: (items: RowType[]) => Promise<void>;
  updateRow: (item: RowType) => void;
  removeRowsByTabId: (tabId: string) => void;
};

export type DataSelectedRowsSlice = {
  selectedRows: Map<number, SelectedRow>;
  toggleClear: boolean;
  getSelectedRows: () => SelectedRow[];
  clearSelectedRows: () => void;
  setSelectedRows: (rows: SelectedRow[]) => void;
};

export type DataColumnSlice = {
  columns: Record<string, ColumnType[]>;
  getColumns: (isActive?: boolean) => ColumnType[];
  updateColumns: (columns: ColumnType[]) => Promise<void>;
  updateColumn: (column: ColumnType) => Promise<void>;
  removeColumnsByTabId: (tabId: string) => void;
};

export type DataEditedColumnSlice = {
  editedColumns: Record<string, EditedColumnType[]>;
  getEditedColumns: () => EditedColumnType[];
  updateEditedColumns: (columns: EditedColumnType[]) => Promise<void>;
  addEditedColumns: (oldValue: ColumnType, newValue: ColumnType | EditedColumnType) => Promise<void>;
  updateRemovedColumns: () => Promise<void>;
  restoreEditedColumns: () => Promise<void>;
  addEmptyEditedColumns: () => Promise<void>;
  removeEditedColumnsByTabId: (tabId: string) => void;
};

export type DataEditedRowsSlice = {
  editedRows: Record<string, EditedRow[]>;
  getEditedRows: () => EditedRow[];
  updateEditedRows: (rows: EditedRow[]) => void;
  restoreEditedRows: () => Promise<void>;
  removeEditedRowsByTabId: (tabId: string) => void;
};

export type DataRemovedRowsSlice = {
  removedRows: Record<string, RowType[]>;
  getRemovedRows: () => RowType[];
  updateRemovedRows: () => void;
  deleteRemovedRowsByTabId: (tabId: string) => void;
};

export type DataUnsavedRowsSlice = {
  unSavedRows: Record<string, RowType[]>;
  getUnsavedRows: () => RowType[];
  addUnsavedRows: (newRow?: RowType) => void;
  updateUnsavedRows: (unSavedRows: RowType[]) => void;
  discardUnsavedRows: (rows?: RowType[]) => void;
  removeUnsavedRowsByTabId: (tabId: string) => void;
};

export type DataQuerySlice = {
  loading: boolean;
  toggleDataFetching: boolean;
  runQuery: () => Promise<void>;
  runRawQuery: () => Promise<void>;
  updateDesignsQuery: () => Promise<void>;
};

export type SelectedRow = {
  index: number; // The row index,
  selectedColumns: string[];
  data: Record<string, any>; // The row's data object
};
