import { useDataStore } from '@/store/dataStore/data.store';
import type { SelectedRow } from '@/store/dataStore/types';
import type { RowType } from '@/types';
import { type Table, flexRender } from '@tanstack/react-table';
import type { JSX } from 'react';
import { useCallback, useMemo } from 'react';
import { StyledTableRow, TableCell } from './TestGrid.styled';

export default function TableBodyRows<T>({
  table,
  context
}: {
  table: Table<T>;
  context: (event: React.MouseEvent) => void;
}): JSX.Element {
  const { getRemovedRows, getUnsavedRows, getEditedRows, setSelectedRows, getSelectedRows } = useDataStore();

  const removed = useMemo(() => getRemovedRows(), [getRemovedRows()]);
  const unsaved = useMemo(() => getUnsavedRows(), [getUnsavedRows()]);
  const edited = useMemo(() => getEditedRows(), [getEditedRows()]);
  const selected = useMemo(() => getSelectedRows(), [getSelectedRows()]);

  const handleSelect = useCallback((cell: any): void => {
    setSelectedRows([
      {
        index: cell.row.index,
        selectedColumn: cell.column.id,
        row: cell.row.original
      }
    ]);
  }, []);

  return (
    <tbody>
      {table.getRowModel().rows.map((row) => {
        const rowIndex = row.index;

        const isRemoved = removed.some((v: RowType) => v.dboIndex === rowIndex);
        const isUnsaved = unsaved.some((v: RowType) => v.dboIndex === rowIndex);
        const isEdited = edited.some((v: RowType) => v.dboIndex === rowIndex);
        const isSelected = selected.some((v: SelectedRow) => v.index === rowIndex);

        return (
          <StyledTableRow
            key={row.id}
            className={`
              ${isRemoved ? 'removed-highlight' : ''}
              ${isUnsaved ? 'unsaved-highlight' : ''}
              ${isEdited ? 'edit-highlight' : ''}
              ${isSelected ? 'selected-highlight' : ''}
            `.trim()}
            onClick={(): void => {
              table.resetRowSelection();
              row.toggleSelected();
            }}
          >
            {row.getVisibleCells().map((cell) => (
              <TableCell
                key={cell.id}
                onContextMenu={(e): void => {
                  context(e);
                  handleSelect(cell);
                }}
                style={{
                  width: cell.column.getSize()
                }}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </StyledTableRow>
        );
      })}
    </tbody>
  );
}
