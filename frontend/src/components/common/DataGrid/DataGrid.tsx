import { useContextMenu } from '@/hooks';
import { useDataStore } from '@/store/dataStore/data.store';
import type { ColumnType } from '@/types';
import { Box, CircularProgress } from '@mui/material';
import { type JSX, useCallback, useMemo, useRef, useState } from 'react';
import { StyledTable, TableContainer } from './DataGrid.styled';
import DataGridContextMenu from './DataGridContextMenu/DataGridContextMenu';
import DataGridTableBodyRows from './DataGridTableBodyRows/DataGridTableBodyRows';
import DataGridTableHeaderRow from './DataGridTableHeaderRow/DataGridTableHeaderRow';
import QuickViewDialog from './QuickViewDialog/QuickViewDialog';
import { useHandleScroll } from './hooks/useHandleScroll';
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

  const [columnSizes, setColumnSizes] = useState<Record<string, number>>({});

  useHandleScroll(tableContainerRef);

  const handleColumnResize = useCallback((newColumnSizes: Record<string, number>) => {
    setColumnSizes(newColumnSizes);
  }, []);

  const tableColumns = useMemo((): ColumnType[] => {
    return [
      {
        name: 'select',
        type: 'checkbox',
        isActive: true,
        notNull: false,
        length: '1',
        comment: '',
        default: '',
        mappedType: ''
      },
      ...columns
    ];
  }, [columns]);

  return loading ? (
    <Box display={'flex'} justifyContent={'center'} alignItems={'center'} flex={1}>
      <CircularProgress size={30} />
    </Box>
  ) : (
    <>
      <QuickViewDialog editable={editable} />
      <TableContainer ref={tableContainerRef}>
        <StyledTable>
          <DataGridTableHeaderRow columns={tableColumns} onColumnResize={handleColumnResize} />
          <DataGridTableBodyRows
            editable={editable}
            rows={rows}
            columns={tableColumns}
            context={handleContextMenu}
            columnSizes={columnSizes}
            removedRows={removedRows}
            unsavedRows={unsavedRows}
            selectedRows={selectedRows}
            editedRows={editedRows}
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
