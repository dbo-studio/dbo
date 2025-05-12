import type { RowType, ColumnType, EditedRow } from '@/types';
import type { SelectedRow } from '@/store/dataStore/types';
import type { RunQueryResponseType } from '@/api/query/types';
import type { ReactNode } from 'react';

// Define the context interface
export interface TableDataContextType {
  // Data access
  rows: RowType[];
  columns: ColumnType[];
  editedRows: EditedRow[];
  removedRows: RowType[];
  unsavedRows: RowType[];
  selectedRows: SelectedRow[];

  // Loading state
  isLoading: boolean;

  // Row operations
  updateRow: (row: RowType) => Promise<void>;
  updateRows: (rows: RowType[]) => Promise<void>;

  // Column operations
  updateColumns: (columns: ColumnType[]) => Promise<void>;
  getActiveColumns: () => ColumnType[];

  // Edited rows operations
  updateEditedRows: (rows: EditedRow[]) => Promise<void>;
  restoreEditedRows: () => Promise<void>;

  // Removed rows operations
  updateRemovedRows: (rows: RowType[]) => Promise<void>;
  deleteRemovedRows: () => Promise<void>;

  // Unsaved rows operations
  updateUnsavedRows: (rows: RowType[]) => Promise<void>;
  addUnsavedRow: (row: RowType) => Promise<void>;

  // Selected rows operations
  setSelectedRows: (rows: SelectedRow[]) => Promise<void>;

  // Query operations
  runQuery: () => Promise<RunQueryResponseType | undefined>;
  runRawQuery: (query?: string) => Promise<RunQueryResponseType | undefined>;
  refreshDataFromServer: () => Promise<void>;
}

// Provider props
export interface TableDataProviderProps {
  children: ReactNode;
}

// State interface
export interface TableDataState {
  rows: RowType[];
  columns: ColumnType[];
  editedRows: EditedRow[];
  removedRows: RowType[];
  unsavedRows: RowType[];
  selectedRows: SelectedRow[];
  isLoading: boolean;
}
