import type { ColumnType, RowType } from '@/types';
import { type JSX } from 'react';
import CustomTestGrid from './components/CustomTestGrid';

export default function TestGrid({
  rows,
  columns,
  loading,
  editable = true
}: {
  rows: RowType[];
  columns: ColumnType[];
  loading: boolean;
  editable?: boolean;
}): JSX.Element {
  // Use our custom implementation with improved column resizing
  return <CustomTestGrid rows={rows} columns={columns} loading={loading} editable={editable} />;
}
