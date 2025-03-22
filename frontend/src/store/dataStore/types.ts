import type { EditedRow } from '@/types';
import type { ColumnType, RowType } from '@/types/Data';

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
};

export type SelectedRow = {
  index: number; // The row index,
  selectedColumns: string[];
  data: Record<string, any>; // The row's data object
};

export type DataFormDataSlice = {
  formDataByTab: Record<string, any[]>;
  getFormData: (tabId: string, action: string) => any[] | undefined;
  updateFormData: (tabId: string, action: string, data: any[]) => void;
  resetFormData: (tabId: string, action: string) => void;
};
