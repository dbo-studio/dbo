import { useDataStore } from '@/store/dataStore/data.store';
import { cellSearchText } from '@/core/utils/dataValue';
import clsx from 'clsx';
import { JSX, memo, useCallback, useMemo } from 'react';
import { SelectTableCell, StyledTableRow, TableCell } from '../../DataGrid.styled';
import { DataGridTableCell } from '../../DataGridTableCell/DataGridTableCell';
import GridCheckbox from '../../GridCheckbox';
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
          const cellEditable = editable && column.editable !== false;
          const value = row[columnId];
          const displayForSearch = cellSearchText(value, column);
          const isSearchMatch = searchTerm ? displayForSearch.toLowerCase().includes(searchTerm.toLowerCase()) : false;

          const isCurrentMatch = currentMatch?.rowIndex === rowIndex && currentMatch?.columnIndex === columnIndex;

          if (columnId === 'select') {
            return (
              <SelectTableCell key={`cell-${rowIndex}-${columnId}`}>
                <GridCheckbox checked={isSelected} onChange={handleSelectCheckBox} aria-label='Select row' />
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
                column={column}
                value={value}
                editable={cellEditable}
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
