import type { RowType } from '@/types';
import type { JSX } from 'react';
import { useCallback } from 'react';
import { StyledTableRow, TableCell } from '../TestGrid.styled';
import type { CustomTableBodyRowsProps } from '../types';

export default function CustomTableBodyRows({
  tableColumns,
  rows,
  context,
  columnSizes,
  removedRows,
  unsavedRows,
  editedRows,
  selectedRows,
  setSelectedRows
}: CustomTableBodyRowsProps): JSX.Element {
  const handleSelect = useCallback(
    (rowIndex: number, columnId: string, row: RowType): void => {
      setSelectedRows([
        {
          index: rowIndex,
          selectedColumn: columnId,
          row: row
        }
      ]);
    },
    [setSelectedRows]
  );

  return (
    <tbody>
      {rows.map((row, rowIndex) => {
        const isRemoved = removedRows.some((v: RowType) => v.dbo_index === rowIndex);
        const isUnsaved = unsavedRows.some((v: RowType) => v.dbo_index === rowIndex);
        const isEdited = editedRows.some((v: any) => v.dboIndex === rowIndex);
        const isSelected = selectedRows.some((v) => v.index === rowIndex);

        return (
          <StyledTableRow
            key={`row-${row.dbo_index}`}
            className={`
              ${isRemoved ? 'removed-highlight' : ''}
              ${isUnsaved ? 'unsaved-highlight' : ''}
              ${isEdited ? 'edit-highlight' : ''}
              ${isSelected ? 'selected-highlight' : ''}
            `.trim()}
          >
            {tableColumns.map((column) => {
              const columnId = column.id;
              const value = row[column.accessor || columnId];

              return (
                <TableCell
                  key={`cell-${rowIndex}-${columnId}`}
                  onContextMenu={(e): void => {
                    context(e);
                    handleSelect(rowIndex, columnId, row);
                  }}
                  style={{ width: columnSizes[columnId] || column.size || 200 }}
                >
                  {column.cell({ row, rowIndex: rowIndex, value })}
                </TableCell>
              );
            })}
          </StyledTableRow>
        );
      })}
    </tbody>
  );
}
