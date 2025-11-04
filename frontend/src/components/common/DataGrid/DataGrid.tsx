import { useContextMenu } from '@/hooks';
import { Box, CircularProgress } from '@mui/material';
import { type JSX, useRef } from 'react';
import { StyledCol, StyledTable, TableContainer, VirtualTableWrapper } from './DataGrid.styled';
import DataGridContextMenu from './DataGridContextMenu/DataGridContextMenu';
import DataGridTableBodyRows from './DataGridTableBodyRows/DataGridTableBodyRows';
import DataGridTableHeaderRow from './DataGridTableHeaderRow/DataGridTableHeaderRow';
import { useColumnResize } from './hooks/useColumnResize';
import { useDataGridColumns } from './hooks/useDataGridColumns';
import { useDataGridSearch } from './hooks/useDataGridSearch';
import { useDataGridSearchIntegration } from './hooks/useDataGridSearchIntegration';
import { useDataGridVirtualization } from './hooks/useDataGridVirtualization';
import { useHandleScroll } from './hooks/useHandleScroll';
import QuickViewDialog from './QuickViewDialog/QuickViewDialog';
import SearchDialog from './SearchDialog/SearchDialog';
import type { DataGridProps } from './types';

const HEADER_HEIGHT = 40;

export default function DataGrid({ rows, columns, loading, editable = true }: DataGridProps): JSX.Element {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();

  useHandleScroll(tableContainerRef);

  const { columnSizes, startResize, resizingColumnId } = useColumnResize({
    columns,
    defaultColumnWidth: 200,
    minColumnWidth: 50
  });

  const { tableColumns, totalTableWidth } = useDataGridColumns({ columns, columnSizes });

  const { virtualRows, paddingTop, paddingBottom, totalSize, rowVirtualizer } = useDataGridVirtualization({
    rowsCount: rows.length,
    loading,
    tableContainerRef
  });

  const search = useDataGridSearch({ rows, columns: tableColumns });

  const { isSearchDialogOpen, setIsSearchDialogOpen, currentMatch } = useDataGridSearchIntegration({
    search,
    rowVirtualizer
  });

  return loading ? (
    <Box display={'flex'} justifyContent={'center'} alignItems={'center'} flex={1}>
      <CircularProgress size={30} />
    </Box>
  ) : (
    <>
      <QuickViewDialog editable={editable} />
      <TableContainer ref={tableContainerRef}>
        <SearchDialog open={isSearchDialogOpen} onClose={() => setIsSearchDialogOpen(false)} search={search} />
        <VirtualTableWrapper height={totalSize + HEADER_HEIGHT}>
          <StyledTable width={totalTableWidth}>
            <colgroup>
              {tableColumns.map((column) => (
                <StyledCol key={column.name} width={columnSizes[column.name]} />
              ))}
            </colgroup>
            <DataGridTableHeaderRow
              columns={tableColumns}
              startResize={startResize}
              resizingColumnId={resizingColumnId}
            />
            <DataGridTableBodyRows
              editable={editable}
              rows={rows}
              columns={tableColumns}
              context={handleContextMenu}
              virtualRows={virtualRows}
              paddingTop={paddingTop}
              paddingBottom={paddingBottom}
              searchTerm={search.searchTerm}
              currentMatch={currentMatch}
            />
          </StyledTable>
        </VirtualTableWrapper>
      </TableContainer>
      <DataGridContextMenu contextMenu={contextMenuPosition} onClose={handleCloseContextMenu} />
    </>
  );
}
