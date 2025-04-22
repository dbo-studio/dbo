import { useContextMenu } from '@/hooks';
import { useDataStore } from '@/store/dataStore/data.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { type JSX, useEffect, useState } from 'react';
import { StyledTable, TableContainer } from './TestGrid.styled';

import ContextMenu from './ContextMenu';
import TableBodyRows from './TableBodyRows';
import TableHeaderRow from './TableHeaderRow';
import useTableColumns from './useTableColumns';

export default function TestGrid(): JSX.Element {
  const { getRows, getColumns, getSelectedRows, updateEditedRows, getEditedRows, updateRow, toggleDataFetching } =
    useDataStore();
  const { selectedTabId } = useTabStore();
  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();
  const { toggleShowQuickLookEditor } = useSettingStore();

  const [data, setData] = useState(getRows());
  const [editingCell, setEditingCell] = useState(null);

  useEffect(() => {
    setData(getRows());
  }, [getRows]);

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
    }
  });

  return (
    <TableContainer>
      <StyledTable onContextMenu={handleContextMenu}>
        <TableHeaderRow table={table} />
        <TableBodyRows table={table} />
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
