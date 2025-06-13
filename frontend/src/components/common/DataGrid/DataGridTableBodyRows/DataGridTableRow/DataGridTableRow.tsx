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
    columnSizes,
    context,
    isSelected,
    isEdited,
    isUnsaved,
    isRemoved,
    editingCell,
    setEditingCell,
    editedRows,
    updateEditedRows,
    updateRow,
    updateSelectedRows
  }: DataGridTableRowProps) => {
    const handleSelect = useCallback(
      (columnId: string) => {
        updateSelectedRows([
          {
            index: rowIndex,
            selectedColumn: columnId,
            row: row
          }
        ]);
      },
      [updateSelectedRows, rowIndex, row]
    );

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
          const isCellEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnId === columnId;

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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                    if (e.target.checked) {
                      updateSelectedRows([
                        {
                          index: rowIndex,
                          selectedColumn: '',
                          row
                        }
                      ]);
                    } else {
                      updateSelectedRows([]);
                    }
                  }}
                  onClick={(e: React.MouseEvent): void => {
                    e.stopPropagation();
                  }}
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
              style={{
                width: columnSizes[columnId] || 200
              }}
            >
              <DataGridTableCell
                row={row}
                rowIndex={rowIndex}
                columnId={columnId}
                value={value}
                isEditing={isCellEditing}
                editingCell={editingCell}
                setEditingCell={setEditingCell}
                editedRows={editedRows}
                updateEditedRows={updateEditedRows}
                updateRow={updateRow}
                setSelectedRows={updateSelectedRows}
              />
            </TableCell>
          );
        })}
      </StyledTableRow>
    );
  }
);

export default DataGridTableRow;
