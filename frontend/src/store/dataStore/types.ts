import type { RunQueryResponseType } from '@/api/query/types';
import type { EditedRow } from '@/types';
import type { ColumnType, RowType } from '@/types/Data';

export type DataStore = {
  loadDataFromIndexedDB: () => Promise<{ rows: RowType[]; columns: ColumnType[] } | null>;
};

export type DataRowSlice = {
  rows: RowType[] | undefined;
  getRow: (row: RowType) => RowType | null | undefined;
  updateRows: (rows: RowType[]) => Promise<void>;
  updateRow: (row: RowType) => Promise<void>;
};

export type DataSelectedRowsSlice = {
  selectedRows: SelectedRow[];
  updateSelectedRows: (rows: SelectedRow[]) => void;
};

export type DataColumnSlice = {
  columns: ColumnType[] | undefined;
  getActiveColumns: () => ColumnType[];
  updateColumns: (columns: ColumnType[]) => Promise<void>;
};

export type DataEditedRowsSlice = {
  editedRows: EditedRow[];
  updateEditedRows: (rows: EditedRow[]) => void;
  restoreEditedRows: () => Promise<void>;
};

export type DataRemovedRowsSlice = {
  removedRows: RowType[];
  updateRemovedRows: (rows: RowType[] | undefined) => void;
};

export type DataUnsavedRowsSlice = {
  unSavedRows: RowType[];
  addUnsavedRows: (newRow?: RowType) => void;
  updateUnsavedRows: (unSavedRows: RowType[]) => void;
  discardUnsavedRows: (rows?: RowType[]) => void;
};

export type DataQuerySlice = {
  isDataFetching: boolean;
  runQuery: () => Promise<RunQueryResponseType | undefined>;
  runRawQuery: (query?: string) => Promise<RunQueryResponseType | undefined>;
  toggleDataFetching: (loading?: boolean) => void;
};

export type SelectedRow = {
  index: number;
  selectedColumn: string;
  row: RowType;
};

export type DataFormDataSlice = {
  formDataByTab: Record<string, Record<string, any>>;
  getFormData: (tabId: string, objectTabId: string) => any[] | undefined;
  updateFormData: (tabId: string, objectTabId: string, data: any[]) => void;
  resetFormData: (tabId: string, objectTabId: string) => void;
};
