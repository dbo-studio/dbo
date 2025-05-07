import { useContextMenu } from '@/hooks';
import { useDataStore } from '@/store/dataStore/data.store';
import { getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { type JSX, useRef, useState } from 'react';
import { StyledTable, TableContainer } from './TestGrid.styled';

import type { ColumnType, RowType } from '@/types';
import { Box, CircularProgress } from '@mui/material';
import QuickViewDialog from '../QuickViewDialog/QuickViewDialog';
import GridContextMenu from './GridContextMenu';
import TableBodyRows from './TableBodyRows';
import TableHeaderRow from './TableHeaderRow';
import { useHandleScroll } from './hooks/useHandleScroll';
import useTableColumns from './hooks/useTableColumns';

export default function TestGrid({
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
  const { updateEditedRows, getEditedRows, updateRow } = useDataStore();
  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();

  const [editingCell, setEditingCell] = useState<{ rowIndex: number; columnId: string } | null>(null);

  useHandleScroll(tableContainerRef);

  const tableColumns = useTableColumns({
    rows: rows,
    columns: columns,
    editingCell,
    setEditingCell,
    updateEditedRows,
    updateRow,
    getEditedRows
  });

  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
    enableRowSelection: false,
    rowCount: columns?.length,
    autoResetAll: true
  });

  return loading ? (
    <Box display={'flex'} justifyContent={'center'} alignItems={'center'} flex={1}>
      <CircularProgress size={30} />
    </Box>
  ) : (
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
