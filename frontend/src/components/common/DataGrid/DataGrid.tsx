import { CircularProgress } from '@mui/material';
import { RefObject, useCallback, useRef, useState, type JSX } from 'react';
import {
  DataGridLoadingOverlayStyled,
  DataGridRootStyled,
  StyledCol,
  StyledTable,
  TableContainer,
  VirtualTableWrapper
} from './DataGrid.styled';
import DataGridContextMenu from './DataGridContextMenu/DataGridContextMenu';
import type { DataGridContextTarget } from './DataGridContextMenu/types';
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

type GridContextMenuState = {
  mouseX: number;
  mouseY: number;
  target: DataGridContextTarget;
};

export default function DataGrid({ rows, columns, loading, editable = true }: DataGridProps): JSX.Element {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<GridContextMenuState | null>(null);

  useHandleScroll(tableContainerRef as RefObject<HTMLDivElement>);

  const { columnSizes, startResize, resizingColumnId } = useColumnResize({
    columns,
    defaultColumnWidth: 200
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

  const openContextMenu = useCallback((event: React.MouseEvent, target: DataGridContextTarget): void => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      mouseX: event.clientX + 2,
      mouseY: event.clientY - 6,
      target
    });
  }, []);

  const closeContextMenu = useCallback((): void => {
    setContextMenu(null);
  }, []);

  const handleEmptyContextMenu = useCallback(
    (event: React.MouseEvent): void => {
      openContextMenu(event, { type: 'empty' });
    },
    [openContextMenu]
  );

  const handleCellContextMenu = useCallback(
    (event: React.MouseEvent, columnName: string): void => {
      openContextMenu(event, { type: 'cell', columnName });
    },
    [openContextMenu]
  );

  const handleHeaderContextMenu = useCallback(
    (event: React.MouseEvent, columnName: string): void => {
      openContextMenu(event, { type: 'header', columnName });
    },
    [openContextMenu]
  );

  return (
    <DataGridRootStyled>
      <QuickViewDialog editable={editable} />
      <SearchDialog open={isSearchDialogOpen} onClose={() => setIsSearchDialogOpen(false)} search={search} />
      <TableContainer
        ref={tableContainerRef}
        sx={{ position: 'relative', flex: 1, minHeight: 0 }}
        onContextMenu={handleEmptyContextMenu}
        data-testid='data-grid-container'
      >
        {loading && (
          <DataGridLoadingOverlayStyled>
            <CircularProgress size={30} />
          </DataGridLoadingOverlayStyled>
        )}
        <VirtualTableWrapper height={totalSize + HEADER_HEIGHT}>
          <StyledTable data-testid='data-grid' width={totalTableWidth}>
            <colgroup>
              {tableColumns.map((column) => (
                <StyledCol key={column.name} width={columnSizes[column.name]} />
              ))}
            </colgroup>
            <DataGridTableHeaderRow
              columns={tableColumns}
              startResize={startResize}
              resizingColumnId={resizingColumnId}
              editable={editable}
              onHeaderContextMenu={handleHeaderContextMenu}
            />
            <DataGridTableBodyRows
              editable={editable}
              rows={rows}
              columns={tableColumns}
              context={handleCellContextMenu}
              virtualRows={virtualRows}
              paddingTop={paddingTop}
              paddingBottom={paddingBottom}
              searchTerm={search.searchTerm}
              currentMatch={currentMatch}
            />
          </StyledTable>
        </VirtualTableWrapper>
      </TableContainer>
      <DataGridContextMenu
        contextMenu={contextMenu ? { mouseX: contextMenu.mouseX, mouseY: contextMenu.mouseY } : null}
        onClose={closeContextMenu}
        target={contextMenu?.target ?? null}
      />
    </DataGridRootStyled>
  );
}
