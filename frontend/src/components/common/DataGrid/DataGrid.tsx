import { useTableData } from '@/contexts/TableDataContext';
import { useContextMenu } from '@/hooks';
import type { ColumnType, RowType } from '@/types';
import { Box, CircularProgress } from '@mui/material';
import { type JSX, useCallback, useRef, useState } from 'react';
import { StyledTable, TableContainer } from './DataGrid.styled';
import DataGridContextMenu from './DataGridContextMenu/DataGridContextMenu';
import DataGridTableBodyRows from './DataGridTableBodyRows/DataGridTableBodyRows';
import DataGridTableHeaderRow from './DataGridTableHeaderRow/DataGridTableHeaderRow';
import QuickViewDialog from './QuickViewDialog/QuickViewDialog';
import { useHandleScroll } from './hooks/useHandleScroll';
import useTableColumns from './hooks/useTableColumns';

interface CustomTestGridProps {
  rows: RowType[];
  columns: ColumnType[];
  loading: boolean;
  editable?: boolean;
}

export default function DataGrid({ rows, columns, loading, editable = true }: CustomTestGridProps): JSX.Element {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { updateEditedRows, editedRows, updateRow, removedRows, unsavedRows, selectedRows, setSelectedRows } =
    useTableData();
  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();

  const [editingCell, setEditingCell] = useState<{ rowIndex: number; columnId: string } | null>(null);
  const [columnSizes, setColumnSizes] = useState<Record<string, number>>({});

  useHandleScroll(tableContainerRef);

  const tableColumns = useTableColumns({
    rows,
    columns,
    editingCell,
    setEditingCell,
    updateEditedRows,
    updateRow,
    editedRows
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
            editedRows={editedRows}
            selectedRows={selectedRows}
            setSelectedRows={setSelectedRows}
          />
        </StyledTable>
      </TableContainer>
      <DataGridContextMenu contextMenu={contextMenuPosition} onClose={handleCloseContextMenu} />
    </>
  );
}
