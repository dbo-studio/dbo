import { useDataStore } from '@/store/dataStore/data.store';
import type { RowType } from '@/types';
import { type Table, flexRender } from '@tanstack/react-table';
import type { Virtualizer } from '@tanstack/react-virtual';
import type { JSX } from 'react';
import { useMemo } from 'react';
import { TableCell } from './TestGrid.styled';

export default function TableBodyRows<T>({
  table,
  virtualizer
}: {
  table: Table<T>;
  virtualizer: Virtualizer<unknown, unknown>;
}): JSX.Element {
  const { rows } = table.getRowModel();
  const { getRemovedRows, getUnsavedRows, getEditedRows } = useDataStore();

  const removed = useMemo(() => getRemovedRows(), [getRemovedRows()]); // Fixed dependency
  const unsaved = useMemo(() => getUnsavedRows(), [getUnsavedRows()]); // Fixed dependency
  const edited = useMemo(() => getEditedRows(), [getEditedRows()]); // Fixed dependency

  return (
    <tbody style={{ position: 'relative' }}>
      {virtualizer.getVirtualItems().map((virtualRow) => {
        const row = rows[virtualRow.index];
        const rowIndex = virtualRow.index;

        const isRemoved = removed.some((v: RowType) => v.dboIndex === rowIndex);
        const isUnsaved = unsaved.some((v: RowType) => v.dboIndex === rowIndex);
        const isEdited = edited.some((v: RowType) => v.dboIndex === rowIndex);

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
              ${row.getIsSelected() ? 'selected' : ''}
            `.trim()}
            onClick={(e) => {
              if (!e.target.closest('input')) {
                row.toggleSelected(e.ctrlKey || e.metaKey);
              }
            }}
          >
            {row.getVisibleCells().map((cell) => (
              <TableCell
                key={cell.id}
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
