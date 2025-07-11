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
  editable: boolean;
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
  editable: boolean;
};
export type DataGridTableHeaderRowProps = {
  columns: ColumnType[];
  startResize: (columnId: string, event: React.MouseEvent | React.TouchEvent) => void;
  resizingColumnId: string | null;
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
