import type { JSX } from 'react';
import CustomTestGrid from './components/CustomTestGrid';
import type { TestGridProps } from './types';

export default function TestGrid({ rows, columns, loading, editable = true }: TestGridProps): JSX.Element {
  // Use our custom implementation with improved column resizing
  return <CustomTestGrid rows={rows} columns={columns} loading={loading} editable={editable} />;
}
