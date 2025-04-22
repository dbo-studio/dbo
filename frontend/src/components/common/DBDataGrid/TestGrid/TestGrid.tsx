import { useContextMenu } from '@/hooks';
import { useDataStore } from '@/store/dataStore/data.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { type JSX, useEffect, useRef, useState } from 'react';
import { StyledTable, TableContainer } from './TestGrid.styled';

import ContextMenu from './ContextMenu';
import TableBodyRows from './TableBodyRows';
import TableHeaderRow from './TableHeaderRow';
import useTableColumns from './useTableColumns';

export default function TestGrid(): JSX.Element {
  const {
    getRows,
    getColumns,
    getSelectedRows,
    setSelectedRows, // Add this
    updateEditedRows,
    getEditedRows,
    updateRow,
    toggleDataFetching,
    isDataFetching
  } = useDataStore();
  const { selectedTabId } = useTabStore();
  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();
  const { toggleShowQuickLookEditor } = useSettingStore();

  const [data, setData] = useState(getRows());
  const [editingCell, setEditingCell] = useState(null);
  const [rowSelection, setRowSelection] = useState({}); // Add this

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
    state: {
      rowSelection
    },
    enableRowSelection: true,
    enableMultiRowSelection: true,
    onRowSelectionChange: setRowSelection
  });

  useEffect(() => {
    // Update data store when row selection changes
    const selectedRowsData = Object.keys(rowSelection)
      .filter((index) => rowSelection[index])
      .map((index) => ({
        index: parseInt(index),
        selectedColumns: table.getAllColumns().map((col) => col.id),
        data: data[parseInt(index)]
      }));

    setSelectedRows(selectedRowsData);
  }, [rowSelection, data, table]);

  const tableContainerRef = useRef<HTMLDivElement>(null);

  const { rows } = table.getRowModel();
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 32, // Approximate row height
    overscan: 10
  });

  return (
    <TableContainer ref={tableContainerRef}>
      <StyledTable
        onContextMenu={handleContextMenu}
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: 'relative'
        }}
      >
        <TableHeaderRow table={table} />
        <TableBodyRows table={table} virtualizer={rowVirtualizer} />
      </StyledTable>

      <ContextMenu
        contextMenuPosition={contextMenuPosition}
        handleClose={handleCloseContextMenu}
        toggleShowQuickLookEditor={toggleShowQuickLookEditor}
        getSelectedRows={getSelectedRows}
        getEditedRows={getEditedRows}
        updateEditedRows={updateEditedRows}
        updateRow={updateRow}
        toggleDataFetching={toggleDataFetching}
        selectedTabId={selectedTabId}
      />
    </TableContainer>
  );
}
