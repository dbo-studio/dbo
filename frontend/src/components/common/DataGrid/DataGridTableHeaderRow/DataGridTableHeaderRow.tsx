import type { JSX } from 'react';
import { StyledTableRow, TableHeader } from '../DataGrid.styled';
import DataGridResizer from '../DataGridResizer/DataGridResizer';
import { useColumnResize } from '../hooks/useColumnResize';
import type { DataGridTableHeaderRowProps } from '../types';

export default function DataGridTableHeaderRow({
  tableColumns,
  columns,
  onColumnResize
}: DataGridTableHeaderRowProps): JSX.Element {
  const { columnSizes, startResize, resizingColumnId } = useColumnResize({
    columns,
    defaultColumnWidth: 200,
    minColumnWidth: 200,
    onColumnResize
  });

  return (
    <thead>
      <StyledTableRow>
        {tableColumns.map((column) => {
          const columnId = column.id;
          const isCurrentColumnResizing = resizingColumnId === columnId;

          return (
            <TableHeader
              key={columnId}
              style={{
                position: 'relative',
                width: columnSizes[columnId] || column.size || 200,
                ...(columnId === 'select'
                  ? {
                      minWidth: '30px',
                      maxWidth: '30px',
                      width: '30px',
                      boxSizing: 'border-box'
                    }
                  : {})
              }}
            >
              {typeof column.header === 'string' ? column.header : column.header}
              <DataGridResizer columnId={columnId} isResizing={isCurrentColumnResizing} onResizeStart={startResize} />
            </TableHeader>
          );
        })}
      </StyledTableRow>
    </thead>
  );
}
