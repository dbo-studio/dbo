import { useDataStore } from '@/store/dataStore/data.store';
import { Checkbox } from '@mui/material';
import type { JSX } from 'react';
import { StyledTableRow, TableHeader } from '../DataGrid.styled';
import DataGridResizer from '../DataGridResizer/DataGridResizer';
import { useColumnResize } from '../hooks/useColumnResize';
import type { DataGridTableHeaderRowProps } from '../types';

export default function DataGridTableHeaderRow({ columns, onColumnResize }: DataGridTableHeaderRowProps): JSX.Element {
  const { columnSizes, startResize, resizingColumnId } = useColumnResize({
    columns,
    defaultColumnWidth: 200,
    minColumnWidth: 200,
    onColumnResize
  });

  const updateSelectedRows = useDataStore((state) => state.updateSelectedRows);

  return (
    <thead>
      <StyledTableRow>
        {columns.map((column) => {
          const isCurrentColumnResizing = resizingColumnId === column.name;

          if (column.name === 'select') {
            return (
              <TableHeader
                key={column.name}
                style={{
                  position: 'relative',
                  minWidth: '30px',
                  maxWidth: '30px',
                  width: '30px',
                  boxSizing: 'border-box',
                  padding: 0
                }}
              >
                <Checkbox
                  sx={{ padding: 0 }}
                  size={'small'}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                    if (e.target.checked) {
                      const rows = useDataStore.getState().rows ?? [];
                      const allRows = rows.map((row, index) => ({
                        index,
                        selectedColumn: '',
                        row
                      }));
                      updateSelectedRows(allRows);
                    } else {
                      updateSelectedRows([]);
                    }
                  }}
                  onClick={(e: React.MouseEvent): void => {
                    e.stopPropagation();
                  }}
                />
              </TableHeader>
            );
          }

          return (
            <TableHeader
              key={column.name}
              style={{
                position: 'relative',
                width: columnSizes[column.name] || 200
              }}
            >
              {column.name}
              <DataGridResizer
                columnId={column.name}
                isResizing={isCurrentColumnResizing}
                onResizeStart={startResize}
              />
            </TableHeader>
          );
        })}
      </StyledTableRow>
    </thead>
  );
}
