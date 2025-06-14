import type { SelectedRow } from '@/store/dataStore/types';
import type { ColumnType, RowType } from '@/types';

export type DataGridProps = {
  rows: RowType[];
  columns: ColumnType[];
  loading: boolean;
  editable?: boolean;
};

export type DataGridTableCellProps = {
  row: any;
  rowIndex: number;
  columnId: string;
  value: any;
  editedRows: any;
  updateEditedRows: (rows: any) => Promise<void>;
  updateRow: (row: any) => Promise<void>;
  setSelectedRows: (rows: SelectedRow[]) => void;
  editable: boolean;
};

export type DataGridTableRowProps = {
  row: RowType;
  rowIndex: number;
  columns: ColumnType[];
  columnSizes: Record<string, number>;
  context: (e: React.MouseEvent) => void;
  isEdited: boolean;
  isUnsaved: boolean;
  isSelected: boolean;
  isRemoved: boolean;
  editedRows: any;
  updateEditedRows: (rows: any) => Promise<void>;
  updateRow: (row: any) => Promise<void>;
  updateSelectedRows: (rows: SelectedRow[]) => void;
  editable: boolean;
};

export type TableColumnsProps = {
  rows: RowType[];
  columns: ColumnType[];
  editingCell: { rowIndex: number; columnId: string } | null;
  setEditingCell: (cell: { rowIndex: number; columnId: string } | null) => void;
  updateEditedRows: (rows: any) => Promise<void>;
  updateRow: (row: any) => Promise<void>;
  editedRows: any;
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

export type DataGridTableBodyRowsProps = {
  rows: RowType[];
  columns: ColumnType[];
  context: (event: React.MouseEvent) => void;
  columnSizes: Record<string, number>;
  removedRows: RowType[];
  unsavedRows: RowType[];
  selectedRows: SelectedRow[];
  editedRows: any[];
  updateEditedRows: (rows: any) => Promise<void>;
  updateRow: (row: any) => Promise<void>;
  updateSelectedRows: (rows: any) => void;
  editable: boolean;
};
export type DataGridTableHeaderRowProps = {
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

export type DataGridResizerProps = {
  columnId: string;
  isResizing: boolean;
  onResizeStart: (columnId: string, event: React.MouseEvent | React.TouchEvent) => void;
};
