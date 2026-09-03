import type { GridMetaType, RunQueryResponseType } from '@/api/query/types';
import type { EditedRow } from '@/types';
import type { ColumnType, RowType } from '@/types/Data';
import { FormFieldWithState } from '@/types/Tree';

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
  updateSelectedRows: (rows: SelectedRow[], replace?: boolean) => void;
};

export type DataColumnSlice = {
  columns: ColumnType[] | undefined;
  getActiveColumns: () => ColumnType[];
  updateColumns: (columns: ColumnType[]) => Promise<void>;
};

export type DataEditedRowsSlice = {
  editedRows: EditedRow[];
  updateEditedRows: (rows: EditedRow[]) => Promise<void>;
  restoreEditedRows: () => Promise<void>;
};

export type DataRemovedRowsSlice = {
  removedRows: RowType[];
  updateRemovedRows: (rows: RowType[] | undefined) => Promise<void>;
};

export type DataUnsavedRowsSlice = {
  unSavedRows: RowType[];
  addUnsavedRows: (newRow?: RowType) => void;
  updateUnsavedRows: (unSavedRows: RowType[]) => Promise<void>;
  discardUnsavedRows: (rows?: RowType[]) => Promise<void>;
};

export type PendingEditorQueryRun = {
  tabId: string;
  query: string;
};

export type DataQuerySlice = {
  isDataFetching: boolean;
  reRunQuery: boolean;
  reRender: boolean;
  lastQueryResult: string | undefined;
  pendingEditorQueryRun?: PendingEditorQueryRun;
  gridEditable: boolean;
  updatableNodeId?: string;
  editableReason?: string;
  drivingTable?: string;
  queryPaginated: boolean;
  clearPendingEditorQueryRun: () => void;
  cancelRunningQuery: (options?: { silent?: boolean }) => void;
  runQuery: (abortController?: AbortController) => Promise<RunQueryResponseType | undefined>;
  runRawQuery: (query?: string, abortController?: AbortController) => Promise<RunQueryResponseType | undefined>;
  runQueryInEditor: (query: string) => void;
  toggleReRunQuery: () => void;
  toggleReRender: () => void;
  toggleDataFetching: (loading?: boolean) => void;
  updateGridMeta: (meta: GridMetaType) => Promise<void>;
  clearGridChanges: () => Promise<void>;
};

export type SelectedRow = {
  index: number;
  selectedColumn: string;
  row: RowType;
};

export type DataFormDataSlice = {
  formDataByTab: Record<string, Record<string, unknown>>;
  getFormData: (tabId: string, objectTabId: string) => unknown[] | undefined;
  updateFormData: (tabId: string, objectTabId: string, data: FormFieldWithState[]) => void;
  resetFormData: (tabId: string, objectTabId: string) => void;
};

export type DataState = DataStore &
  DataRowSlice &
  DataSelectedRowsSlice &
  DataEditedRowsSlice &
  DataRemovedRowsSlice &
  DataUnsavedRowsSlice &
  DataColumnSlice &
  DataQuerySlice &
  DataFormDataSlice;
