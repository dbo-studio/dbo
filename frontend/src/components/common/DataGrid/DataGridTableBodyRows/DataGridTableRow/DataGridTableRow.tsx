import { useDataStore, useDataStoreApi } from '@/store/dataStore/data.store';
import { cellSearchText } from '@/core/utils/dataValue';
import clsx from 'clsx';
import { JSX, memo, useCallback, useMemo } from 'react';
import { SelectTableCell, StyledTableRow, TableCell } from '../../DataGrid.styled';
import { DataGridTableCell } from '../../DataGridTableCell/DataGridTableCell';
import GridCheckbox from '../../GridCheckbox';
import type { DataGridTableRowProps } from '../../types';

function cellClassName(col: number, focused: boolean, start: number, end: number, edges: number): string | undefined {
  if (col >= start && col <= end) {
    return clsx(
      'range-cell',
      edges & 1 && 'range-top',
      edges & 2 && 'range-bottom',
      col === start && 'range-left',
      col === end && 'range-right'
    );
  }
  return focused ? 'focused-cell' : undefined;
}

const DataGridTableRow = memo(
  function DataGridTableRow({
    row,
    rowIndex,
    columns,
    context,
    isSelected,
    selectedColumn,
    rangeStart = -1,
    rangeEnd = -1,
    rangeEdges = 0,
    isEdited,
    isUnsaved,
    isRemoved,
    editable,
    searchTerm,
    currentMatch,
    columnWindow
  }: DataGridTableRowProps): JSX.Element {
    const updateSelectedRows = useDataStore((state) => state.updateSelectedRows);
    const dataStoreApi = useDataStoreApi();

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
          const selectedRows = dataStoreApi.getState().selectedRows;
          const newSelectedRows = selectedRows.filter(
            (selectedRow: { index: number }) => selectedRow.index !== rowIndex
          );
          updateSelectedRows(newSelectedRows, true);
        }
      },
      [updateSelectedRows, dataStoreApi, rowIndex, row]
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
        {columnWindow && columnWindow.leftPad > 0 && (
          <td aria-hidden style={{ padding: 0, border: 0 }} colSpan={columnWindow.start} />
        )}
        {columns.map((column, columnIndex) => {
          if (columnWindow && (columnIndex < columnWindow.start || columnIndex >= columnWindow.end)) return null;
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
              data-r={rowIndex}
              data-c={columnIndex}
              className={cellClassName(columnIndex, isSelected && selectedColumn === columnId, rangeStart, rangeEnd, rangeEdges)}
              onContextMenu={(e): void => {
                e.stopPropagation();
                context(e, columnId);
                // Keep a multi-row / multi-cell selection when right-clicking inside it.
                const state = dataStoreApi.getState();
                const inRange = columnIndex >= rangeStart && columnIndex <= rangeEnd;
                if (!inRange && !(isSelected && state.selectedRows.length > 1)) handleSelect(columnId);
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
        {columnWindow && columnWindow.rightPad > 0 && (
          <td aria-hidden style={{ padding: 0, border: 0 }} colSpan={columns.length - columnWindow.end} />
        )}
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
      prevProps.selectedColumn === nextProps.selectedColumn &&
      prevProps.rangeStart === nextProps.rangeStart &&
      prevProps.rangeEnd === nextProps.rangeEnd &&
      prevProps.rangeEdges === nextProps.rangeEdges &&
      prevProps.isEdited === nextProps.isEdited &&
      prevProps.isUnsaved === nextProps.isUnsaved &&
      prevProps.isRemoved === nextProps.isRemoved &&
      prevProps.editable === nextProps.editable &&
      prevProps.columns.length === nextProps.columns.length &&
      prevProps.columns.every((col, idx) => col.name === nextProps.columns[idx]?.name) &&
      prevProps.columnWindow?.start === nextProps.columnWindow?.start &&
      prevProps.columnWindow?.end === nextProps.columnWindow?.end &&
      prevProps.searchTerm === nextProps.searchTerm &&
      prevProps.currentMatch?.rowIndex === nextProps.currentMatch?.rowIndex &&
      prevProps.currentMatch?.columnIndex === nextProps.currentMatch?.columnIndex
    );
  }
);

export default DataGridTableRow;
