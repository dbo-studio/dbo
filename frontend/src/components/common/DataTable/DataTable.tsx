import { formatCellDisplayValue } from '@/core/utils/dataValue';
import type { ColumnType, RowType } from '@/types';
import { LinearProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import type { JSX, ReactNode } from 'react';

type DataTableProps = {
  rows: RowType[];
  columns: ColumnType[];
  loading?: boolean;
  /** Return a node to replace the default cell content, or undefined to keep it. */
  renderCell?: (row: RowType, column: string) => ReactNode;
};

/** Light read-only table in the data grid's look. Use DataGrid only when you need selection, editing or resizing. */
export default function DataTable({ rows, columns, loading = false, renderCell }: DataTableProps): JSX.Element {
  return (
    <TableContainer sx={{ flex: 1, minWidth: 0, height: '100%' }}>
      {loading && <LinearProgress />}
      <Table stickyHeader size='small'>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell key={column.name}>{column.name}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.dbo_index}>
              {columns.map((column) => {
                const custom = renderCell?.(row, column.name);
                const value = row[column.name];
                const text = formatCellDisplayValue(value, column);
                return (
                  <TableCell key={column.name} title={custom === undefined ? text : undefined} sx={{ maxWidth: 400 }}>
                    {custom !== undefined ? (
                      custom
                    ) : value === null || value === undefined ? (
                      <span style={{ fontStyle: 'italic', opacity: 0.6 }}>NULL</span>
                    ) : (
                      text
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
