import { useContextMenu } from '@/hooks';
import type { ColumnType } from '@/types';
import { Box, CircularProgress } from '@mui/material';
import { type JSX, useMemo, useRef } from 'react';
import { StyledTable, TableContainer } from './DataGrid.styled';
import DataGridContextMenu from './DataGridContextMenu/DataGridContextMenu';
import DataGridTableBodyRows from './DataGridTableBodyRows/DataGridTableBodyRows';
import DataGridTableHeaderRow from './DataGridTableHeaderRow/DataGridTableHeaderRow';
import QuickViewDialog from './QuickViewDialog/QuickViewDialog';
import { useColumnResize } from './hooks/useColumnResize';
import { useHandleScroll } from './hooks/useHandleScroll';
import type { DataGridProps } from './types';

export default function DataGrid({ rows, columns, loading, editable = true }: DataGridProps): JSX.Element {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();

  useHandleScroll(tableContainerRef);

  const { columnSizes, startResize, resizingColumnId } = useColumnResize({
    columns,
    defaultColumnWidth: 200,
    minColumnWidth: 50
  });

  const tableColumns = useMemo((): ColumnType[] => {
    return [
      {
        name: 'select',
        type: 'checkbox',
        isActive: true,
        notNull: false,
        length: '1',
        comment: '',
        default: '',
        mappedType: ''
      },
      ...columns
    ];
  }, [columns]);

  const totalTableWidth = useMemo(() => {
    return Object.values(columnSizes).reduce((total, width) => total + width, 0);
  }, [columnSizes]);

  return loading ? (
    <Box display={'flex'} justifyContent={'center'} alignItems={'center'} flex={1}>
      <CircularProgress size={30} />
    </Box>
  ) : (
    <>
      <QuickViewDialog editable={editable} />
      <TableContainer ref={tableContainerRef}>
        <StyledTable style={{ width: totalTableWidth }}>
          <colgroup>
            {tableColumns.map((column) => (
              <col key={column.name} style={{ width: columnSizes[column.name] }} />
            ))}
          </colgroup>
          <DataGridTableHeaderRow
            columns={tableColumns}
            startResize={startResize}
            resizingColumnId={resizingColumnId}
          />
          <DataGridTableBodyRows editable={editable} rows={rows} columns={tableColumns} context={handleContextMenu} />
        </StyledTable>
      </TableContainer>
      <DataGridContextMenu contextMenu={contextMenuPosition} onClose={handleCloseContextMenu} />
    </>
  );
}
