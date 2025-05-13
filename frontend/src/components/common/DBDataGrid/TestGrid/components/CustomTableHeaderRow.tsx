import type { JSX } from 'react';
import { StyledTableRow, TableHeader } from '../TestGrid.styled';
import { CustomResizer } from './CustomResizer';
import { useColumnResize } from '../hooks/useColumnResize';
import type { ColumnType } from '@/types';
import { CustomColumnDef } from '../hooks/useTableColumns';

interface CustomTableHeaderRowProps {
  tableColumns: CustomColumnDef[];
  columns: ColumnType[];
  onColumnResize?: (columnSizes: Record<string, number>) => void;
}

export default function CustomTableHeaderRow({
  tableColumns,
  columns,
  onColumnResize
}: CustomTableHeaderRowProps): JSX.Element {
  const { columnSizes, startResize, isResizing, resizingColumnId } = useColumnResize({
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
                width: columnSizes[columnId] || column.size || 200
              }}
            >
              {typeof column.header === 'string' ? column.header : column.header}
              <CustomResizer columnId={columnId} isResizing={isCurrentColumnResizing} onResizeStart={startResize} />
            </TableHeader>
          );
        })}
      </StyledTableRow>
    </thead>
  );
}
