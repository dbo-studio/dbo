import { useDataStore } from '@/store/dataStore/data.store';
import type { SelectedRow } from '@/store/dataStore/types';
import type { RowType } from '@/types';
import { type Table, flexRender } from '@tanstack/react-table';
import type { Virtualizer } from '@tanstack/react-virtual';
import type { JSX } from 'react';
import { useCallback, useMemo } from 'react';
import { TableCell } from './TestGrid.styled';

export default function TableBodyRows<T>({
  table,
  virtualizer,
  context
}: {
  table: Table<T>;
  virtualizer: Virtualizer<unknown, unknown>;
  context: (event: React.MouseEvent) => void;
}): JSX.Element {
  const { rows } = table.getRowModel();
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
    <tbody style={{ position: 'relative' }}>
      {virtualizer.getVirtualItems().map((virtualRow) => {
        const row = rows[virtualRow.index];
        const rowIndex = virtualRow.index;

        const isRemoved = removed.some((v: RowType) => v.dboIndex === rowIndex);
        const isUnsaved = unsaved.some((v: RowType) => v.dboIndex === rowIndex);
        const isEdited = edited.some((v: RowType) => v.dboIndex === rowIndex);
        const isSelected = selected.some((v: SelectedRow) => v.index === rowIndex);

        return (
          <tr
            key={row.id}
            style={{
              height: '22px',
              transform: `translateY(${virtualRow.start}px)`,
              position: 'absolute',
              left: 0,
              right: 0,
              width: '100%',
              cursor: 'pointer'
            }}
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
                onClick={(): void => handleSelect(cell)}
                style={{
                  width: cell.column.getSize(),
                  minWidth: cell.column.getSize(),
                  maxWidth: cell.column.getSize()
                }}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </tr>
        );
      })}
    </tbody>
  );
}
