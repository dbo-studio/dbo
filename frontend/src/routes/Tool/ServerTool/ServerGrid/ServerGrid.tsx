import DataTable from '@/components/common/DataTable/DataTable';
import type { ColumnType, RowType } from '@/types';
import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import locales from '@/locales';

export default function ServerGrid({
  headers,
  values,
  loading = false,
  empty,
  action
}: {
  headers: string[];
  values: unknown[][];
  loading?: boolean;
  empty?: string;
  action?: (row: unknown[], index: number) => ReactNode;
}) {
  const actionColumn = locales.nosql_more_actions;
  const columns = (action ? [...headers, actionColumn] : headers).map((name): ColumnType => ({
    name,
    default: '',
    comment: '',
    length: '',
    type: 'text',
    mappedType: 'unknown',
    notNull: false,
    isActive: true,
    isPrimaryKey: false
  }));
  const rows = values.map((row, index): RowType => ({
    ...Object.fromEntries(headers.map((name, columnIndex) => [name, row[columnIndex]])),
    dbo_index: index
  }));

  if (empty && !loading && rows.length === 0) {
    return <Typography color='text.secondary'>{empty}</Typography>;
  }

  return (
    <Box sx={{ height: Math.min(Math.max(rows.length + 1, 3) * 41, 450), minWidth: 0 }} data-testid='server-grid'>
      <DataTable
        rows={rows}
        columns={columns}
        loading={loading}
        renderCell={
          action
            ? (row, column) => (column === actionColumn ? action(values[row.dbo_index], row.dbo_index) : undefined)
            : undefined
        }
      />
    </Box>
  );
}
