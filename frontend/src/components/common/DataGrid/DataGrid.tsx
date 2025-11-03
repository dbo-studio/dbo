import { useContextMenu } from '@/hooks';
import type { ColumnType } from '@/types';
import { Box, CircularProgress } from '@mui/material';
import { useVirtualizer } from '@tanstack/react-virtual';
import { type JSX, useMemo, useRef } from 'react';
import { StyledTable, TableContainer } from './DataGrid.styled';
import DataGridContextMenu from './DataGridContextMenu/DataGridContextMenu';
import DataGridTableBodyRows from './DataGridTableBodyRows/DataGridTableBodyRows';
import DataGridTableHeaderRow from './DataGridTableHeaderRow/DataGridTableHeaderRow';
import { useColumnResize } from './hooks/useColumnResize';
import { useHandleScroll } from './hooks/useHandleScroll';
import QuickViewDialog from './QuickViewDialog/QuickViewDialog';
import type { DataGridProps } from './types';

const ROW_HEIGHT = 22; // Height of each row in pixels
const HEADER_HEIGHT = 40; // Approximate height of header row

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

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10, // Render 10 extra rows outside viewport for smooth scrolling
    enabled: rows.length > 0 && !loading
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  const paddingTop = virtualRows.length > 0 ? (virtualRows[0]?.start ?? 0) : 0;
  const paddingBottom =
    virtualRows.length > 0 ? totalSize - (virtualRows[virtualRows.length - 1]?.end ?? 0) : 0;

  return loading ? (
    <Box display={'flex'} justifyContent={'center'} alignItems={'center'} flex={1}>
      <CircularProgress size={30} />
    </Box>
  ) : (
    <>
      <QuickViewDialog editable={editable} />
      <TableContainer ref={tableContainerRef}>
        <div style={{ height: `${totalSize + HEADER_HEIGHT}px`, position: 'relative' }}>
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
            <DataGridTableBodyRows
              editable={editable}
              rows={rows}
              columns={tableColumns}
              context={handleContextMenu}
              virtualRows={virtualRows}
              paddingTop={paddingTop}
              paddingBottom={paddingBottom}
            />
          </StyledTable>
        </div>
      </TableContainer>
      <DataGridContextMenu contextMenu={contextMenuPosition} onClose={handleCloseContextMenu} />
    </>
  );
}
