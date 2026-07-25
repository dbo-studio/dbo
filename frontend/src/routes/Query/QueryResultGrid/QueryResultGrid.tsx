import DataGrid from '@/components/common/DataGrid/DataGrid';
import DataGridStatusBar from '@/components/common/DataGridStatusBar/DataGridStatusBar';
import { useDataStore } from '@/store/dataStore/data.store';
import { Box } from '@mui/material';
import type { ColumnType, RowType } from '@/types';
import type { JSX } from 'react';

type QueryResultGridProps = {
  loading: boolean;
  rows: RowType[];
  columns: ColumnType[];
};

export default function QueryResultGrid({ loading, rows, columns }: QueryResultGridProps): JSX.Element {
  const gridEditable = useDataStore((state) => state.gridEditable);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <DataGrid editable={gridEditable} rows={rows} columns={columns} loading={loading} />
      </Box>
      <DataGridStatusBar />
    </Box>
  );
}
