import { useTableData } from '@/contexts/TableDataContext';
import { useContextMenu } from '@/hooks';
import type { ColumnType, RowType } from '@/types';
import { Box, CircularProgress } from '@mui/material';
import { type JSX, useCallback, useRef, useState } from 'react';
import QuickViewDialog from '../../QuickViewDialog/QuickViewDialog';
import GridContextMenu from '../GridContextMenu';
import { StyledTable, TableContainer } from '../TestGrid.styled';
import { useHandleScroll } from '../hooks/useHandleScroll';
import useTableColumns from '../hooks/useTableColumns';
import CustomTableBodyRows from './CustomTableBodyRows';
import CustomTableHeaderRow from './CustomTableHeaderRow';

interface CustomTestGridProps {
  rows: RowType[];
  columns: ColumnType[];
  loading: boolean;
  editable?: boolean;
}

export default function CustomTestGrid({ rows, columns, loading, editable = true }: CustomTestGridProps): JSX.Element {
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
          <CustomTableHeaderRow tableColumns={tableColumns} columns={columns} onColumnResize={handleColumnResize} />
          <CustomTableBodyRows
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
      <GridContextMenu contextMenu={contextMenuPosition} onClose={handleCloseContextMenu} />
    </>
  );
}
