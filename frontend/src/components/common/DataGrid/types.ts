import type { ColumnType, RowType } from '@/types';
import type { ColumnWindow } from './hooks/useDataGridColumnWindow';
import type { UseDataGridSearchReturn } from './hooks/useDataGridSearch';

export type DataGridProps = {
  rows: RowType[];
  columns: ColumnType[];
  loading: boolean;
  editable?: boolean;
  /**
   * Rows that belong to no table tab (the agent canvas): read-only, without sorting or the row menu,
   * since those act on the open tab's query.
   */
  standalone?: boolean;
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
  context: (e: React.MouseEvent, columnName: string) => void;
  isEdited: boolean;
  isUnsaved: boolean;
  isSelected: boolean;
  selectedColumn?: string;
  /** Cell range columns on this row (-1 = none); edges: 1 = first range row, 2 = last. */
  rangeStart?: number;
  rangeEnd?: number;
  rangeEdges?: number;
  isRemoved: boolean;
  editable: boolean;
  searchTerm?: string;
  currentMatch?: { rowIndex: number; columnIndex: number } | null;
  columnWindow?: ColumnWindow;
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
  context: (event: React.MouseEvent, columnName: string) => void;
  editable: boolean;
  searchTerm?: string;
  currentMatch?: { rowIndex: number; columnIndex: number } | null;
  columnWindow?: ColumnWindow;
};
export type DataGridTableHeaderRowProps = {
  columns: ColumnType[];
  startResize: (columnId: string, event: React.MouseEvent | React.TouchEvent) => void;
  resizingColumnId: string | null;
  editable?: boolean;
  /** Clicking a header sorts the tab's query; off for rows that belong to no tab. */
  sortable?: boolean;
  onHeaderContextMenu?: (event: React.MouseEvent, columnName: string) => void;
  columnWindow?: ColumnWindow;
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
