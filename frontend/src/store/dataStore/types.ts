import type { EditedRow, TabType } from '@/types';
import type { ColumnType, RowType } from '@/types/Data';

export type DataStore = object;

export type DataRowSlice = {
  rows: Record<string, RowType[]>;
  getRows: (tab: TabType | undefined) => RowType[];
  getRow: (tab: TabType, dboIndex: number) => RowType | null | undefined;
  updateRows: (tab: TabType, items: RowType[]) => Promise<void>;
  updateRow: (tab: TabType, item: RowType) => void;
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
  getColumns: (tab: TabType | undefined, isActive?: boolean) => ColumnType[];
  updateColumns: (tab: TabType, columns: ColumnType[]) => Promise<void>;
  removeColumnsByTabId: (tabId: string) => void;
};

export type DataEditedRowsSlice = {
  editedRows: Record<string, EditedRow[]>;
  getEditedRows: (tab: TabType | undefined) => EditedRow[];
  updateEditedRows: (tab: TabType, rows: EditedRow[]) => void;
  restoreEditedRows: (tab: TabType) => Promise<void>;
  removeEditedRowsByTabId: (tabId: string) => void;
};

export type DataRemovedRowsSlice = {
  removedRows: Record<string, RowType[]>;
  getRemovedRows: (tab: TabType | undefined) => RowType[];
  updateRemovedRows: (tab: TabType) => void;
  deleteRemovedRowsByTabId: (tabId: string) => void;
};

export type DataUnsavedRowsSlice = {
  unSavedRows: Record<string, RowType[]>;
  getUnsavedRows: (tab: TabType | undefined) => RowType[];
  addUnsavedRows: (newRow?: RowType) => void;
  updateUnsavedRows: (tab: TabType, unSavedRows: RowType[]) => void;
  discardUnsavedRows: (tab: TabType, rows?: RowType[]) => void;
  removeUnsavedRowsByTabId: (tabId: string) => void;
};

export type DataQuerySlice = {
  loading: boolean;
  toggleDataFetching: boolean;
  runQuery: (tab: TabType) => Promise<void>;
  runRawQuery: (tab: TabType | undefined) => Promise<void>;
};

export type SelectedRow = {
  index: number; // The row index,
  selectedColumns: string[];
  data: Record<string, any>; // The row's data object
};

export type DataFormDataSlice = {
  formDataByTab: Record<string, Record<string, any>>;
  getFormData: (tabId: string, objectTabId: string) => any[] | undefined;
  updateFormData: (tabId: string, objectTabId: string, data: any[]) => void;
  resetFormData: (tabId: string, objectTabId: string) => void;
};
