import { useContextMenu } from '@/hooks';
import { useDataStore } from '@/store/dataStore/data.store';
import { getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { type JSX, useEffect, useRef, useState } from 'react';
import { StyledTable, TableContainer } from './TestGrid.styled';

import type { ColumnType, RowType } from '@/types';
import QuickViewDialog from '../QuickViewDialog/QuickViewDialog';
import GridContextMenu from './GridContextMenu';
import TableBodyRows from './TableBodyRows';
import TableHeaderRow from './TableHeaderRow';
import { useHandleScroll } from './hooks/useHandleScroll';
import useTableColumns from './hooks/useTableColumns';

export default function TestGrid({
  rows,
  columns,
  editable = true
}: {
  rows: RowType[];
  columns: ColumnType[];
  editable?: boolean;
}): JSX.Element {
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const { updateEditedRows, getEditedRows, updateRow, toggleDataFetching } = useDataStore();

  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; columnId: string } | null>(null);

  useHandleScroll(tableContainerRef);

  useEffect(() => {
    console.log(rows);
  }, [rows]);

  const tableColumns = useTableColumns({
    rows,
    columns: columns,
    editingCell,
    setEditingCell,
    updateEditedRows,
    updateRow,
    getEditedRows,
    toggleDataFetching
  });

  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
    enableRowSelection: false,
    rowCount: rows.length
  });

  return (
    <>
      <QuickViewDialog editable={editable} />
      <TableContainer ref={tableContainerRef}>
        <StyledTable>
          <TableHeaderRow table={table} />
          <TableBodyRows context={handleContextMenu} table={table} />
        </StyledTable>
      </TableContainer>
      <GridContextMenu contextMenu={contextMenuPosition} onClose={handleCloseContextMenu} />
    </>
  );
}
