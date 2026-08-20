import type { ColumnType, RowType } from '@/types';
import type { UseDataGridSearchReturn } from './hooks/useDataGridSearch';

export type DataGridProps = {
  rows: RowType[];
  columns: ColumnType[];
  loading: boolean;
  editable?: boolean;
};

export type DataGridTableCellProps = {
  row: RowType;
  rowIndex: number;
  columnId: string;
  column?: ColumnType;
  value: unknown;
  editable: boolean;
  searchTerm?: string;
  isSearchMatch?: boolean;
  isCurrentMatch?: boolean;
};

export type DataGridTableRowProps = {
  row: RowType;
  rowIndex: number;
  columns: ColumnType[];
  context: (e: React.MouseEvent) => void;
  isEdited: boolean;
  isUnsaved: boolean;
  isSelected: boolean;
  isRemoved: boolean;
  editable: boolean;
  searchTerm?: string;
  currentMatch?: { rowIndex: number; columnIndex: number } | null;
};

export type CellEditingReturn = {
  inputRef: React.RefObject<HTMLInputElement | null>;
  handleRowChange: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => void;
  commitValue: (newValue: unknown) => void;
  commitFields: (updates: Record<string, unknown>) => void;
};

export type CellSelectionReturn = {
  handleClick: (e: React.MouseEvent) => void;
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
};

export interface RowSelectionReturn {
  handleRowSelection: (rowIndex: number, isSelected: boolean, event: React.MouseEvent) => void;
}

export type DataGridTableBodyRowsProps = {
  rows: RowType[];
  columns: ColumnType[];
  context: (event: React.MouseEvent) => void;
  editable: boolean;
  searchTerm?: string;
  currentMatch?: { rowIndex: number; columnIndex: number } | null;
};
export type DataGridTableHeaderRowProps = {
  columns: ColumnType[];
  startResize: (columnId: string, event: React.MouseEvent | React.TouchEvent) => void;
  resizingColumnId: string | null;
  editable?: boolean;
};

export type CellProps = {
  row: RowType;
  rowIndex: number;
  value: string | number | boolean | null | undefined;
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

export type SearchDialogProps = {
  open: boolean;
  onClose: () => void;
  search: UseDataGridSearchReturn;
};
