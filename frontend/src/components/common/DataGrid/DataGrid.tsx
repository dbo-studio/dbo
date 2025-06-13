import { useContextMenu } from '@/hooks';
import { useDataStore } from '@/store/dataStore/data.store';
import { Box, CircularProgress } from '@mui/material';
import { type JSX, useCallback, useRef, useState } from 'react';
import { StyledTable, TableContainer } from './DataGrid.styled';
import DataGridContextMenu from './DataGridContextMenu/DataGridContextMenu';
import DataGridTableBodyRows from './DataGridTableBodyRows/DataGridTableBodyRows';
import DataGridTableHeaderRow from './DataGridTableHeaderRow/DataGridTableHeaderRow';
import QuickViewDialog from './QuickViewDialog/QuickViewDialog';
import { useHandleScroll } from './hooks/useHandleScroll';
import useTableColumns from './hooks/useTableColumns';
import type { DataGridProps } from './types';

export default function DataGrid({ rows, columns, loading, editable = true }: DataGridProps): JSX.Element {
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const editedRows = useDataStore((state) => state.editedRows);
  const removedRows = useDataStore((state) => state.removedRows);
  const unsavedRows = useDataStore((state) => state.unSavedRows);
  const selectedRows = useDataStore((state) => state.selectedRows);

  const updateEditedRows = useDataStore((state) => state.updateEditedRows);
  const updateRow = useDataStore((state) => state.updateRow);
  const updateSelectedRows = useDataStore((state) => state.updateSelectedRows);

  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();

  const [editingCell, setEditingCell] = useState<{ rowIndex: number; columnId: string } | null>(null);
  const [columnSizes, setColumnSizes] = useState<Record<string, number>>({});

  useHandleScroll(tableContainerRef);

  const tableColumns = useTableColumns({
    columns
  });

  const handleColumnResize = useCallback((newColumnSizes: Record<string, number>) => {
    setColumnSizes(newColumnSizes);
  }, []);

  return loading ? (
    <Box display={'flex'} justifyContent={'center'} alignItems={'center'} flex={1}>
      <CircularProgress size={30} />
    </Box>
  ) : (
    <>
      <QuickViewDialog editable={editable} />
      <TableContainer ref={tableContainerRef}>
        <StyledTable>
          <DataGridTableHeaderRow tableColumns={tableColumns} columns={columns} onColumnResize={handleColumnResize} />
          <DataGridTableBodyRows
            tableColumns={tableColumns}
            rows={rows}
            context={handleContextMenu}
            columnSizes={columnSizes}
            removedRows={removedRows}
            unsavedRows={unsavedRows}
            selectedRows={selectedRows}
            editedRows={editedRows}
            editingCell={editingCell}
            setEditingCell={setEditingCell}
            updateEditedRows={updateEditedRows}
            updateRow={updateRow}
            updateSelectedRows={updateSelectedRows}
          />
        </StyledTable>
      </TableContainer>
      <DataGridContextMenu contextMenu={contextMenuPosition} onClose={handleCloseContextMenu} />
    </>
  );
}
