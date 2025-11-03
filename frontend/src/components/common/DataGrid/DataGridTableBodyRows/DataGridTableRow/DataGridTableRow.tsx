import { useDataStore } from '@/store/dataStore/data.store';
import { Checkbox, useTheme } from '@mui/material';
import { memo, useCallback, useMemo } from 'react';
import { StyledTableRow, TableCell } from '../../DataGrid.styled';
import { DataGridTableCell } from '../../DataGridTableCell/DataGridTableCell';
import type { DataGridTableRowProps } from '../../types';

const DataGridTableRow = memo(
  ({
    row,
    rowIndex,
    columns,
    context,
    isSelected,
    isEdited,
    isUnsaved,
    isRemoved,
    editable
  }: DataGridTableRowProps) => {
    const theme = useTheme();
    const updateSelectedRows = useDataStore((state) => state.updateSelectedRows);

    // the row style is used to apply background color to the row based on the row index
    // because the rows are virtualized, we need to apply the background color to the row based on the row index
    const hasHighlight = isRemoved || isUnsaved || isEdited || isSelected;
    const rowStyle = useMemo(
      () => ({
        backgroundColor: !hasHighlight && rowIndex % 2 !== 0 ? theme.palette.background.subdued : undefined
      }),
      [rowIndex, theme.palette.background.subdued, hasHighlight]
    );

    const handleSelect = useCallback(
      (columnId: string) => {
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
          const newSelectedRows = selectedRows.filter((selectedRow) => selectedRow.index !== rowIndex);
          updateSelectedRows(newSelectedRows, true);
        }
      },
      [updateSelectedRows, rowIndex, row]
    );

    const className = useMemo(
      () =>
        `
        ${isRemoved ? 'removed-highlight' : ''}
        ${isUnsaved ? 'unsaved-highlight' : ''}
        ${isEdited ? 'edit-highlight' : ''}
        ${isSelected ? 'selected-highlight' : ''}
      `.trim(),
      [isRemoved, isUnsaved, isEdited, isSelected]
    );

    return (
      <StyledTableRow className={className} style={rowStyle}>
        {columns.map((column) => {
          const columnId = column.name;
          const value = row[columnId];

          if (columnId === 'select') {
            return (
              <TableCell
                key={`cell-${rowIndex}-${columnId}`}
                style={{
                  width: '30px',
                  minWidth: '30px',
                  maxWidth: '30px',
                  boxSizing: 'border-box',
                  textAlign: 'center'
                }}
              >
                <Checkbox
                  sx={{ padding: 0 }}
                  size={'small'}
                  checked={isSelected}
                  onChange={handleSelectCheckBox}
                  onClick={(e: React.MouseEvent): void => e.stopPropagation()}
                />
              </TableCell>
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
              <DataGridTableCell row={row} rowIndex={rowIndex} columnId={columnId} value={value} editable={editable} />
            </TableCell>
          );
        })}
      </StyledTableRow>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function for better memoization
    return (
      prevProps.row.dbo_index === nextProps.row.dbo_index &&
      prevProps.rowIndex === nextProps.rowIndex &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.isEdited === nextProps.isEdited &&
      prevProps.isUnsaved === nextProps.isUnsaved &&
      prevProps.isRemoved === nextProps.isRemoved &&
      prevProps.editable === nextProps.editable &&
      prevProps.columns.length === nextProps.columns.length &&
      prevProps.columns.every((col, idx) => col.name === nextProps.columns[idx]?.name)
    );
  }
);

export default DataGridTableRow;
