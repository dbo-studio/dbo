import { useDataStore } from '@/store/dataStore/data.store';
import { Checkbox } from '@mui/material';
import clsx from 'clsx';
import { JSX, memo, useCallback, useMemo } from 'react';
import { SelectTableCell, StyledTableRow, TableCell } from '../../DataGrid.styled';
import { DataGridTableCell } from '../../DataGridTableCell/DataGridTableCell';
import type { DataGridTableRowProps } from '../../types';

const DataGridTableRow = memo(
  function DataGridTableRow({
    row,
    rowIndex,
    columns,
    context,
    isSelected,
    isEdited,
    isUnsaved,
    isRemoved,
    editable,
    searchTerm,
    currentMatch
  }: DataGridTableRowProps): JSX.Element {
    const updateSelectedRows = useDataStore((state) => state.updateSelectedRows);

    // the row style is used to apply background color to the row based on the row index
    // because the rows are virtualized, we need to apply the background color to the row based on the row index
    const hasHighlight: boolean = isRemoved || isUnsaved || isEdited || isSelected;
    const isStriped: boolean = !hasHighlight && rowIndex % 2 !== 0;

    const handleSelect = useCallback(
      (columnId: string): void => {
        updateSelectedRows(
          [
            {
              index: rowIndex,
              selectedColumn: columnId,
              row: row
            }
          ],
          true
        );
      },
      [updateSelectedRows, rowIndex, row]
    );

    const handleSelectCheckBox = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>): void => {
        if (e.target.checked) {
          updateSelectedRows([
            {
              index: rowIndex,
              selectedColumn: '',
              row
            }
          ]);
        } else {
          const selectedRows = useDataStore.getState().selectedRows;
          const newSelectedRows = selectedRows.filter(
            (selectedRow: { index: number }) => selectedRow.index !== rowIndex
          );
          updateSelectedRows(newSelectedRows, true);
        }
      },
      [updateSelectedRows, rowIndex, row]
    );

    const rowClassName = useMemo(
      () =>
        clsx({
          'removed-highlight': isRemoved,
          'unsaved-highlight': isUnsaved,
          'edit-highlight': isEdited,
          'selected-highlight': isSelected,
          'is-striped': isStriped
        }),
      [isRemoved, isUnsaved, isEdited, isSelected, isStriped]
    );

    return (
      <StyledTableRow className={rowClassName}>
        {columns.map((column, columnIndex) => {
          const columnId = column.name;
          const value =
            row[columnId] !== undefined &&
            (typeof row[columnId] === 'string' ||
              typeof row[columnId] === 'number' ||
              typeof row[columnId] === 'boolean' ||
              row[columnId] === null)
              ? (row[columnId] as string | number | boolean | null)
              : undefined;

          const isSearchMatch =
            searchTerm && typeof value === 'string'
              ? value.toLowerCase().includes(searchTerm.toLowerCase())
              : searchTerm
                ? String(value ?? '')
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase())
                : false;

          const isCurrentMatch = currentMatch?.rowIndex === rowIndex && currentMatch?.columnIndex === columnIndex;

          if (columnId === 'select') {
            return (
              <SelectTableCell key={`cell-${rowIndex}-${columnId}`}>
                <Checkbox
                  sx={{ padding: 0 }}
                  size={'small'}
                  checked={isSelected}
                  onChange={handleSelectCheckBox}
                  onClick={(e: React.MouseEvent): void => e.stopPropagation()}
                />
              </SelectTableCell>
            );
          }

          return (
            <TableCell
              key={`cell-${rowIndex}-${columnId}`}
              onContextMenu={(e): void => {
                context(e);
                handleSelect(columnId);
              }}
            >
              <DataGridTableCell
                row={row}
                rowIndex={rowIndex}
                columnId={columnId}
                value={value}
                editable={editable}
                searchTerm={searchTerm}
                isSearchMatch={isSearchMatch}
                isCurrentMatch={isCurrentMatch}
              />
            </TableCell>
          );
        })}
      </StyledTableRow>
    );
  },
  (prevProps: DataGridTableRowProps, nextProps: DataGridTableRowProps): boolean => {
    const rowChanged = prevProps.row !== nextProps.row;

    if (rowChanged) {
      return false;
    }

    return (
      prevProps.rowIndex === nextProps.rowIndex &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.isEdited === nextProps.isEdited &&
      prevProps.isUnsaved === nextProps.isUnsaved &&
      prevProps.isRemoved === nextProps.isRemoved &&
      prevProps.editable === nextProps.editable &&
      prevProps.columns.length === nextProps.columns.length &&
      prevProps.columns.every((col, idx) => col.name === nextProps.columns[idx]?.name) &&
      prevProps.searchTerm === nextProps.searchTerm &&
      prevProps.currentMatch?.rowIndex === nextProps.currentMatch?.rowIndex &&
      prevProps.currentMatch?.columnIndex === nextProps.currentMatch?.columnIndex
    );
  }
);

export default DataGridTableRow;
