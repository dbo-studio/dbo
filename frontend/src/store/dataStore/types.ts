import type { GridMetaType, RunQueryResponseType } from '@/api/query/types';
import type { CellRange } from '@/components/common/DataGrid/cellRange';
import type { PaneId } from '@/store/tabStore/tabs';
import type { EditedRow } from '@/types';
import type { ColumnType, RowType } from '@/types/Data';
import { FormFieldWithState } from '@/types/Tree';

export type DataStore = {
  /** Split-view pane this store belongs to; 'scoped' for a grid outside the panes, which has no tab. */
  paneId: PaneId | 'scoped';
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
  /** Multi-cell (Excel-style) selection. Mutually exclusive with selectedRows. */
  cellRange: CellRange | null;
  setCellRange: (range: CellRange | null) => void;
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
  /** false = only put the SQL into the editor (Insert), don't execute it. */
  run: boolean;
};

/** A command the assistant (or a snippet) hands to the bottom-panel terminal. */
export type PendingTerminalCommand = {
  command: string;
  /** false = only put the command on the prompt (Insert); the user presses Enter. */
  run: boolean;
};

export type DataQuerySlice = {
  isDataFetching: boolean;
  reRunQuery: boolean;
  reRender: boolean;
  lastQueryResult: string | undefined;
  pendingEditorQueryRun?: PendingEditorQueryRun;
  pendingTerminalCommand?: PendingTerminalCommand;
  gridEditable: boolean;
  updatableNodeId?: string;
  editableReason?: string;
  drivingTable?: string;
  queryPaginated: boolean;
  clearPendingEditorQueryRun: () => void;
  clearPendingTerminalCommand: () => void;
  /** Opens the terminal and puts a command on its prompt, or runs it. For connections without an editor tab (Redis). */
  sendToTerminal: (command: string, run: boolean) => void;
  cancelRunningQuery: (options?: { silent?: boolean }) => void;
  runQuery: (abortController?: AbortController) => Promise<RunQueryResponseType | undefined>;
  runRawQuery: (query?: string, abortController?: AbortController) => Promise<RunQueryResponseType | undefined>;
  runQueryInEditor: (query: string) => void;
  /** Puts SQL into the active Query tab (or a new one) and syncs the open editor. */
  insertQueryInEditor: (query: string) => void;
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
