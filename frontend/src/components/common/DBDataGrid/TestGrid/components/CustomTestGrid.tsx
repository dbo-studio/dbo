import { useContextMenu } from '@/hooks';
import { useTableData } from '@/contexts/TableDataContext';
import { type JSX, useCallback, useRef, useState } from 'react';
import { StyledTable, TableContainer } from '../TestGrid.styled';

import type { ColumnType, RowType } from '@/types';
import { Box, CircularProgress } from '@mui/material';
import QuickViewDialog from '../../QuickViewDialog/QuickViewDialog';
import GridContextMenu from '../GridContextMenu';
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
  const { updateEditedRows, editedRows, updateRow, removedRows, unsavedRows, selectedRows, setSelectedRows } =
    useTableData();
  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();

  const [editingCell, setEditingCell] = useState<{ rowIndex: number; columnId: string } | null>(null);

  // State for column sizes
  const [columnSizes, setColumnSizes] = useState<Record<string, number>>({});

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

  return loading ? (
    <Box display={'flex'} justifyContent={'center'} alignItems={'center'} flex={1}>
      <CircularProgress size={30} />
    </Box>
  ) : (
    <>
      <QuickViewDialog editable={editable} />
      <TableContainer ref={tableContainerRef}>
        <StyledTable>
          <CustomTableHeaderRow tableColumns={tableColumns} columns={columns} onColumnResize={handleColumnResize} />
          <CustomTableBodyRows
            tableColumns={tableColumns}
            visibleRows={rows}
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
      <GridContextMenu contextMenu={contextMenuPosition} onClose={handleCloseContextMenu} />
    </>
  );
}
