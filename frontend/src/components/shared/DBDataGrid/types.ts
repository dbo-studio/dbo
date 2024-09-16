import type { ColumnType, RowType } from '@/types';
import type { RenderCellProps } from 'react-data-grid';

export interface CustomCellRendererProps<TRow, TSummaryRow> extends RenderCellProps<TRow, TSummaryRow> {}

export type DBDataGridProps = {
  rows: RowType[];
  columns: ColumnType[];
  loading: boolean;
};
