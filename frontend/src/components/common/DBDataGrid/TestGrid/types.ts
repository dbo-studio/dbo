import type { SelectedRow } from '@/store/dataStore/types';
import type { ColumnType, RowType } from '@/types';
import type { JSX } from 'react';

export type CustomColumnDef = {
  id: string;
  header: JSX.Element | string;
  accessor?: string;
  cell: (props: CellProps) => JSX.Element;
  size?: number;
  minSize?: number;
  maxSize?: number;
};

export type MemoizedCellProps = {
  row: any;
  rowIndex: number;
  columnId: string;
  value: any;
  isEditing: boolean;
  editingCell: { rowIndex: number; columnId: string } | null;
  setEditingCell: (cell: { rowIndex: number; columnId: string } | null) => void;
  editedRows: any;
  updateEditedRows: (rows: any) => Promise<void>;
  updateRow: (row: any) => Promise<void>;
  setSelectedRows: (rows: any) => Promise<void>;
  onRowUpdate: (newValue: string) => void;
};

export type TableColumnsProps = {
  rows: RowType[];
  columns: ColumnType[];
  editingCell: { rowIndex: number; columnId: string } | null;
  setEditingCell: (cell: { rowIndex: number; columnId: string } | null) => void;
  updateEditedRows: (rows: any) => Promise<void>;
  updateRow: (row: any) => Promise<void>;
  editedRows: any;
  onRowUpdate: (newValue: string) => void;
};

export type CellEditingReturn = {
  inputRef: React.RefObject<HTMLInputElement | null>;
  handleRowChange: (e: React.FocusEvent<HTMLInputElement>) => void;
};

export type CellSelectionReturn = {
  handleClick: (
    e: React.MouseEvent,
    setEditingCell: (cell: { rowIndex: number; columnId: string } | null) => void
  ) => void;
};

export interface RowSelectionReturn {
  handleRowSelection: (rowIndex: number, isSelected: boolean, event: React.MouseEvent) => void;
}

export type CustomTableBodyRowsProps = {
  tableColumns: CustomColumnDef[];
  rows: RowType[];
  context: (event: React.MouseEvent) => void;
  columnSizes: Record<string, number>;
  removedRows: RowType[];
  unsavedRows: RowType[];
  editedRows: any[];
  selectedRows: SelectedRow[];
  setSelectedRows: (rows: SelectedRow[]) => void;
};

export type CustomTableHeaderRowProps = {
  tableColumns: CustomColumnDef[];
  columns: ColumnType[];
  onColumnResize?: (columnSizes: Record<string, number>) => void;
};

export type CellProps = {
  row: any;
  rowIndex: number;
  value: any;
  onRowUpdate: (newValue: string) => void;
};

export type TestGridProps = {
  rows: RowType[];
  columns: ColumnType[];
  loading: boolean;
  editable?: boolean;
};
