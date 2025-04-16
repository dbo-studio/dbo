import type { ColumnType, RowType } from '@/types';

export type DataGridProps = {
  rows: RowType[];
  columns: ColumnType[];
  loading: boolean;
  editable?: boolean;
};
