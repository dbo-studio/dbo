import { useDataStore } from '@/store/dataStore/data.store';
import { Checkbox } from '@mui/material';
import { memo, useCallback } from 'react';
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
    editedRows,
    editable
  }: DataGridTableRowProps) => {
    const updateSelectedRows = useDataStore((state) => state.updateSelectedRows);

    const handleSelect = useCallback(
      (columnId: string) => {
        updateSelectedRows([
          {
            index: rowIndex,
            selectedColumn: columnId,
            row: row
          }
        ], true);
      },
      [updateSelectedRows, rowIndex, row]
    );

    const handleSelectCheckBox = (e: React.ChangeEvent<HTMLInputElement>): void => {
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
        const newSelectedRows = selectedRows.filter((row) => row.index !== rowIndex);
        updateSelectedRows(newSelectedRows, true);
      }
    };

    return (
      <StyledTableRow
        className={`
        ${isRemoved ? 'removed-highlight' : ''}
        ${isUnsaved ? 'unsaved-highlight' : ''}
        ${isEdited ? 'edit-highlight' : ''}
        ${isSelected ? 'selected-highlight' : ''}
      `.trim()}
      >
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
              <DataGridTableCell
                row={row}
                rowIndex={rowIndex}
                columnId={columnId}
                value={value}
                editedRows={editedRows}
                editable={editable}
              />
            </TableCell>
          );
        })}
      </StyledTableRow>
    );
  }
);

export default DataGridTableRow;
