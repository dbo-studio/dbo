import type { SelectedRow } from '@/store/dataStore/types';
import type { ColumnType, RowType } from '@/types';
import type { JSX } from 'react';
import { useCallback } from 'react';
import { StyledTableRow, TableCell } from '../TestGrid.styled';
import { CustomColumnDef } from '../hooks/useTableColumns';

interface CustomTableBodyRowsProps {
  tableColumns: CustomColumnDef[];
  visibleRows: RowType[];
  context: (event: React.MouseEvent) => void;
  virtualStartIndex?: number;
  columnSizes: Record<string, number>;
  columns: ColumnType[];
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
  virtualStartIndex = 0,
  columnSizes,
  columns,
  removedRows,
  unsavedRows,
  editedRows,
  selectedRows,
  setSelectedRows
}: CustomTableBodyRowsProps): JSX.Element {

  const handleSelect = useCallback(
    (rowIndex: number, columnId: string, row: RowType): void => {
      // Use the real row index by adding virtualStartIndex to the relative index
      const realRowIndex = virtualStartIndex + rowIndex;
      setSelectedRows([
        {
          index: realRowIndex,
          selectedColumn: columnId,
          row: row
        }
      ]);
    },
    [virtualStartIndex, setSelectedRows]
  );

  return (
    <tbody>
      {visibleRows.map((row, rowIndex) => {
        // Calculate the real row index by adding virtualStartIndex to the relative index
        const realRowIndex = virtualStartIndex + rowIndex;

        const isRemoved = removedRows.some((v: RowType) => v.dbo_index === realRowIndex);
        const isUnsaved = unsavedRows.some((v: RowType) => v.dbo_index === realRowIndex);
        const isEdited = editedRows.some((v: any) => v.dboIndex === realRowIndex);
        const isSelected = selectedRows.some((v: SelectedRow) => v.index === realRowIndex);

        return (
          <StyledTableRow
            key={`row-${realRowIndex}`}
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
                  key={`cell-${realRowIndex}-${columnId}`}
                  onContextMenu={(e): void => {
                    context(e);
                    handleSelect(rowIndex, columnId, row);
                  }}
                  style={{ width: columnSizes[columnId] || column.size || 200 }}
                >
                  {column.cell({ row, rowIndex: realRowIndex, value })}
                </TableCell>
              );
            })}
          </StyledTableRow>
        );
      })}
    </tbody>
  );
}
