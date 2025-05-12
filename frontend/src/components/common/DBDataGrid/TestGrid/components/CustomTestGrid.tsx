import {useContextMenu} from '@/hooks';
import {useTableData} from '@/contexts/TableDataContext';
import {getCoreRowModel, useReactTable} from '@tanstack/react-table';
import {type JSX, useCallback, useEffect, useRef, useState} from 'react';
import {StyledTable, TableContainer} from '../TestGrid.styled';

import type {ColumnType, RowType} from '@/types';
import {Box, CircularProgress} from '@mui/material';
import QuickViewDialog from '../../QuickViewDialog/QuickViewDialog';
import GridContextMenu from '../GridContextMenu';
import {useHandleScroll} from '../hooks/useHandleScroll';
import useTableColumns from '../hooks/useTableColumns';
import CustomTableHeaderRow from './CustomTableHeaderRow';
import CustomTableBodyRows from './CustomTableBodyRows';

export default function CustomTestGrid({
  rows,
  columns,
  loading,
  editable = true
}: {
  rows: RowType[];
  columns: ColumnType[];
  loading: boolean;
  editable?: boolean;
}): JSX.Element {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { updateEditedRows, editedRows, updateRow } = useTableData();
  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();

  const [editingCell, setEditingCell] = useState<{ rowIndex: number; columnId: string } | null>(null);
  const [visibleRows, setVisibleRows] = useState<RowType[]>([]);
  const [startIndex, setStartIndex] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [rowHeight] = useState(22); // Based on the height in TableCell styling
  const [visibleRowCount, setVisibleRowCount] = useState(0);
  const [totalHeight, setTotalHeight] = useState(0);

  // State for column sizes
  const [columnSizes, setColumnSizes] = useState<Record<string, number>>({});

  useHandleScroll(tableContainerRef);

  // Calculate visible rows based on scroll position
  useEffect(() => {
    if (tableContainerRef.current) {
      const container = tableContainerRef.current;
      const height = container.clientHeight;
      setContainerHeight(height);

      // Calculate how many rows can be visible at once (add buffer for smooth scrolling)
      const visibleCount = Math.ceil(height / rowHeight) + 10;
      setVisibleRowCount(visibleCount);

      // Calculate total scrollable height
      setTotalHeight(rows.length * rowHeight);

      // Update visible rows on initial load
      const initialVisibleCount = Math.min(visibleCount, rows.length);
      setVisibleRows(rows.slice(0, initialVisibleCount));

      // Add scroll event listener
      const handleScroll = () => {
        const scrollTop = container.scrollTop;
        updateVisibleRows(scrollTop);
      };

      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [rows.length, rowHeight, visibleRowCount]);

  // Update visible rows based on scroll position
  const updateVisibleRows = (scrollTop: number) => {
    const start = Math.floor(scrollTop / rowHeight);
    const newStartIndex = Math.max(0, start - 5); // Add buffer rows above
    setStartIndex(newStartIndex);

    // Use a default value for visibleRowCount if it's not set yet
    const count = visibleRowCount || Math.ceil(containerHeight / rowHeight) + 10;
    const visibleCount = Math.min(count, rows.length - newStartIndex);

    // Ensure we always show at least some rows if available
    if (visibleCount > 0) {
      setVisibleRows(rows.slice(newStartIndex, newStartIndex + visibleCount));
    } else if (rows.length > 0) {
      // Fallback to show at least the first few rows
      setVisibleRows(rows.slice(0, Math.min(10, rows.length)));
    }
  };

  const tableColumns = useTableColumns({
    rows: rows,
    columns: columns,
    editingCell,
    setEditingCell,
    updateEditedRows,
    updateRow,
    editedRows
  });

  // Handle column resize
  const handleColumnResize = useCallback((newColumnSizes: Record<string, number>) => {
    setColumnSizes(newColumnSizes);
  }, []);

  const table = useReactTable({
    data: visibleRows,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    // Disable TanStack Table's built-in column resizing
    enableColumnResizing: false,
    enableRowSelection: false,
    autoResetAll: false,
    debugTable: false
  });

  return loading ? (
    <Box display={'flex'} justifyContent={'center'} alignItems={'center'} flex={1}>
      <CircularProgress size={30} />
    </Box>
  ) : (
    <>
      <QuickViewDialog editable={editable} />
      <TableContainer ref={tableContainerRef}>
        {/* Spacer div to maintain scroll height */}
        <div style={{ height: totalHeight, position: 'absolute', width: '1px', opacity: 0 }} />

        {/* Position the table at the correct scroll offset */}
        <div style={{ position: 'absolute', top: startIndex * rowHeight, width: '100%' }}>
          <StyledTable>
            <CustomTableHeaderRow table={table} columns={columns} onColumnResize={handleColumnResize} />
            <CustomTableBodyRows
              table={table}
              context={handleContextMenu}
              virtualStartIndex={startIndex}
              columnSizes={columnSizes}
              columns={columns}
            />
          </StyledTable>
        </div>
      </TableContainer>
      <GridContextMenu contextMenu={contextMenuPosition} onClose={handleCloseContextMenu} />
    </>
  );
}
