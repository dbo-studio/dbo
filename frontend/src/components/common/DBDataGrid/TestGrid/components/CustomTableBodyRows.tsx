import type { SelectedRow } from '@/store/dataStore/types';
import type { RowType } from '@/types';
import type React, { JSX } from 'react';
import { useCallback } from 'react';
import { StyledTableRow, TableCell } from '../TestGrid.styled';
import type { CustomColumnDef } from '../hooks/useTableColumns';

interface CustomTableBodyRowsProps {
  tableColumns: CustomColumnDef[];
  visibleRows: RowType[];
  context: (event: React.MouseEvent) => void;
  columnSizes: Record<string, number>;
  removedRows: RowType[];
  unsavedRows: RowType[];
  editedRows: any[];
  selectedRows: SelectedRow[];
  setSelectedRows: (rows: SelectedRow[]) => void;
}

export default function CustomTableBodyRows({
  tableColumns,
  visibleRows,
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
      {visibleRows.map((row, rowIndex) => {
        const isRemoved = removedRows.some((v: RowType) => v.dbo_index === rowIndex);
        const isUnsaved = unsavedRows.some((v: RowType) => v.dbo_index === rowIndex);
        const isEdited = editedRows.some((v: any) => v.dboIndex === rowIndex);
        const isSelected = selectedRows.some((v: SelectedRow) => v.index === rowIndex);

        return (
          <StyledTableRow
            key={`row-${rowIndex}`}
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
                  {column.cell({ row, rowIndex, value })}
                </TableCell>
              );
            })}
          </StyledTableRow>
        );
      })}
    </tbody>
  );
}
