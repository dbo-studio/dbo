import {flexRender, type Table} from '@tanstack/react-table';
import type {JSX} from 'react';
import {StyledTableRow, TableHeader} from '../TestGrid.styled';
import {CustomResizer} from './CustomResizer';
import {useColumnResize} from '../hooks/useColumnResize';
import type {ColumnType} from '@/types';

interface CustomTableHeaderRowProps<T> {
  table: Table<T>;
  columns: ColumnType[];
  onColumnResize?: (columnSizes: Record<string, number>) => void;
}

export default function CustomTableHeaderRow<T>({
  table,
  columns,
  onColumnResize
}: CustomTableHeaderRowProps<T>): JSX.Element {
  const { columnSizes, startResize, isResizing, resizingColumnId } = useColumnResize({
    columns,
    defaultColumnWidth: 150,
    minColumnWidth: 50,
    maxColumnWidth: 400,
    onColumnResize
  });

  return (
    <thead>
      {table.getHeaderGroups().map((headerGroup) => (
        <StyledTableRow key={headerGroup.id}>
          {headerGroup.headers.map((header) => {
            const columnId = header.id;
            const isCurrentColumnResizing = resizingColumnId === columnId;

            return (
              <TableHeader
                key={columnId}
                colSpan={header.colSpan}
                style={{
                  position: 'relative',
                  width: columnSizes[columnId] || header.getSize()
                }}
              >
                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                <CustomResizer columnId={columnId} isResizing={isCurrentColumnResizing} onResizeStart={startResize} />
              </TableHeader>
            );
          })}
        </StyledTableRow>
      ))}
    </thead>
  );
}
