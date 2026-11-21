import type { MenuType } from '@/components/base/ContextMenu/types';
import type { ColumnType, RowType } from '@/types';

export type DataGridMenuDeps = {
  writesBlocked: boolean;
  writeReason: string | undefined;
  fetching: boolean;
  isDataFetching: boolean;
  focusedColumnName: string | undefined;
  focusedRow: RowType | undefined;
  focusedColumn: ColumnType | undefined;
  rowsToCopy: RowType[];
  columns: ColumnType[];
  copyText: (text: string) => void;
  applySort: (operator: string) => void;
  applyFilter: (operator: string, value: string) => void;
  hideColumn: () => void;
  openFields: () => void;
  valueReplacer: (newValue: string | null | undefined) => void;
  rangeReplacer: (newValue: string | null) => void;
  rangeText: (format: 'tsv' | 'csv') => string;
  addRow: () => Promise<void>;
  duplicateRow: (row?: RowType) => Promise<void>;
  removeSelectedRows: () => Promise<void>;
  refreshOrStop: () => void;
  showQuickLookEditor: () => void;
  buildSharedGridItems: () => MenuType[];
};
