import { useContextMenu } from '@/hooks';
import { useDataStore } from '@/store/dataStore/data.store';
import { getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { type JSX, useMemo, useRef, useState } from 'react';
import { StyledTable, TableContainer } from './TestGrid.styled';

import { useTabStore } from '@/store/tabStore/tab.store';
import QuickViewDialog from '../QuickViewDialog/QuickViewDialog';
import GridContextMenu from './GridContextMenu';
import TableBodyRows from './TableBodyRows';
import TableHeaderRow from './TableHeaderRow';
import useTableColumns from './useTableColumns';

export default function TestGrid({ editable = true }: any): JSX.Element {
  const { getRows, getColumns, updateEditedRows, getEditedRows, updateRow, toggleDataFetching, isDataFetching } =
    useDataStore();

  const { selectedTabId } = useTabStore();

  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();

  const [editingCell, setEditingCell] = useState<{ rowIndex: number; columnId: string } | null>(null);

  const rows = useMemo(() => getRows(), [isDataFetching, selectedTabId]);

  const tableColumns = useTableColumns({
    data: rows,
    columns: getColumns(true),
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
    enableRowSelection: false
  });

  const tableContainerRef = useRef<HTMLDivElement>(null);

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
