import { useContextMenu } from '@/hooks';
import { useDataStore } from '@/store/dataStore/data.store';
import { getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { type JSX, useEffect, useRef, useState } from 'react';
import { StyledTable, TableContainer } from './TestGrid.styled';

import QuickViewDialog from '../QuickViewDialog/QuickViewDialog';
import GridContextMenu from './GridContextMenu';
import TableBodyRows from './TableBodyRows';
import TableHeaderRow from './TableHeaderRow';
import useTableColumns from './useTableColumns';

export default function TestGrid({ editable = true }: any): JSX.Element {
  const { getRows, getColumns, updateEditedRows, getEditedRows, updateRow, toggleDataFetching, isDataFetching } =
    useDataStore();
  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();

  const [data, setData] = useState(getRows());
  const [editingCell, setEditingCell] = useState(null);

  useEffect(() => {
    setData(getRows());
  }, [getRows, isDataFetching]);

  const tableColumns = useTableColumns({
    data,
    columns: getColumns(true),
    editingCell,
    setEditingCell,
    updateEditedRows,
    updateRow,
    getEditedRows,
    toggleDataFetching
  });

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
    defaultColumn: {
      minSize: 50,
      maxSize: 400,
      size: 100
    },
    enableRowSelection: false
  });

  const tableContainerRef = useRef<HTMLDivElement>(null);

  const { rows } = table.getRowModel();
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: (): HTMLElement | null => tableContainerRef.current,
    estimateSize: (): number => 32,
    overscan: 10
  });

  return (
    <>
      <QuickViewDialog editable={editable} />
      <TableContainer ref={tableContainerRef}>
        <StyledTable
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: 'relative'
          }}
        >
          <TableHeaderRow table={table} />
          <TableBodyRows context={handleContextMenu} table={table} virtualizer={rowVirtualizer} />
        </StyledTable>
      </TableContainer>
      <GridContextMenu contextMenu={contextMenuPosition} onClose={handleCloseContextMenu} />
    </>
  );
}
