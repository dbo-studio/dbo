// types.ts
import {
  CellContent,
  CellInput,
  Resizer,
  StyledTable,
  StyledTableRow,
  TableCell,
  TableContainer,
  TableHeader
} from '@/components/common/DBDataGrid/TestGrid/TestGrid.styled';
import { handelRowChangeLog } from '@/core/utils';
import { useContextMenu } from '@/hooks';
import { useDataStore } from '@/store/dataStore/data.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import { Divider, Menu, MenuItem } from '@mui/material';
// TestGrid.tsx
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { type JSX, useCallback, useEffect, useMemo, useState } from 'react';

export interface TableRow {
  [key: string]: any;
}

export interface TableColumn {
  name: string;
  // Add other column properties if needed
}

export interface EditingCell {
  rowIndex: number;
  columnId: string;
}

export default function TestGrid(): JSX.Element {
  const {
    getRows,
    getColumns,
    getSelectedRows,
    updateEditedRows,
    getEditedRows,
    updateRow,
    toggleDataFetching,
    isDataFetching
  } = useDataStore();

  const { selectedTabId } = useTabStore();

  const { toggleShowQuickLookEditor } = useSettingStore();

  const [data, setData] = useState<TableRow[]>(getRows());
  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);

  const columnHelper = createColumnHelper<TableRow>();

  const columns = useMemo<TableColumn[]>(() => getColumns(true), [selectedTabId, isDataFetching]);

  useEffect(() => {
    setData(getRows());
  }, [getRows()]);

  const tableColumns = useMemo(
    () =>
      columns.map((col) =>
        columnHelper.accessor(col.name, {
          header: col.name,
          size: 100,
          minSize: 50,
          maxSize: 400,
          cell: ({ row, column, getValue }): JSX.Element => {
            const isEditing = editingCell?.rowIndex === row.index && editingCell?.columnId === column.id;

            if (isEditing) {
              return (
                <CellInput
                  value={String(getValue())}
                  onChange={(e): void => {
                    const newData = [...data];
                    const newRow = {
                      ...newData[row.index],
                      [column.id]: e.target.value
                    };
                    newData[row.index] = newRow;
                    setData(newData);

                    const editedRows = handelRowChangeLog(
                      getEditedRows(),
                      row.original,
                      column.id,
                      row.original[column.id],
                      e.target.value
                    );
                    updateEditedRows(editedRows);
                    updateRow(newRow);
                    toggleDataFetching();
                  }}
                  onBlur={(): void => setEditingCell(null)}
                  autoFocus
                />
              );
            }

            return (
              <CellContent onDoubleClick={(): void => setEditingCell({ rowIndex: row.index, columnId: column.id })}>
                {String(getValue())}
              </CellContent>
            );
          }
        })
      ),
    [data, editingCell, columns]
  );

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

  const valueReplacer = useCallback(
    (newValue: any): void => {
      if (!selectedTabId) return;

      const rows = getSelectedRows();
      for (const row of rows) {
        if (!row.data) continue;
        const newRow = { ...row.data };

        for (const column of row.selectedColumns) {
          const editedRows = handelRowChangeLog(getEditedRows(), row.data, column, row.data[column], newValue);
          updateEditedRows(editedRows);
          newRow[column] = newValue;
          updateRow(newRow);
          toggleDataFetching();
        }
      }
    },
    [selectedTabId, getSelectedRows(), getEditedRows(), isDataFetching]
  );

  const handleSetValue = (value: string | null): void => {
    valueReplacer(value);
    handleCloseContextMenu();
  };

  return (
    <TableContainer>
      <StyledTable onContextMenu={handleContextMenu}>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <StyledTableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHeader
                  key={header.id}
                  colSpan={header.colSpan}
                  style={{
                    width: `${header.getSize()}px`,
                    minWidth: `${header.getSize()}px`,
                    maxWidth: `${header.getSize()}px`,
                    position: 'relative'
                  }}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {header.column.getCanResize() && (
                    <Resizer
                      onMouseDown={header.getResizeHandler()}
                      onTouchStart={header.getResizeHandler()}
                      className={`resizer ${header.column.getIsResizing() ? 'isResizing' : ''}`}
                      style={{
                        transform: header.column.getIsResizing()
                          ? `translateX(${table.getState().columnSizingInfo.deltaOffset}px)`
                          : ''
                      }}
                    />
                  )}
                </TableHeader>
              ))}
            </StyledTableRow>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
              ))}
            </tr>
          ))}
        </tbody>
      </StyledTable>

      <Menu
        open={Boolean(contextMenuPosition)}
        onClose={handleCloseContextMenu}
        anchorReference='anchorPosition'
        anchorPosition={
          contextMenuPosition ? { top: contextMenuPosition.mouseY, left: contextMenuPosition.mouseX } : undefined
        }
      >
        <MenuItem
          onClick={(): void => {
            toggleShowQuickLookEditor(true);
            handleCloseContextMenu();
          }}
        >
          Quick look editor
        </MenuItem>
        <Divider />
        <MenuItem>
          Set value
          <Menu open={false}>
            <MenuItem onClick={(): void => handleSetValue('')}>Empty</MenuItem>
            <MenuItem onClick={(): void => handleSetValue(null)}>Null</MenuItem>
            <MenuItem onClick={(): void => handleSetValue('@DEFAULT')}>Default</MenuItem>
          </Menu>
        </MenuItem>
      </Menu>
    </TableContainer>
  );
}
