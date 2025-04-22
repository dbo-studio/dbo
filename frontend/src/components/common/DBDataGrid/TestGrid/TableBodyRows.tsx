import { type Table, flexRender } from '@tanstack/react-table';
import type { JSX } from 'react';
import { TableCell } from './TestGrid.styled';

export default function TableBodyRows<T>({
  table
}: {
  table: Table<T>;
}): JSX.Element {
  return (
    <tbody>
      {table.getRowModel().rows.map((row) => (
        <tr key={row.id}>
          {row.getVisibleCells().map((cell) => (
            <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
          ))}
        </tr>
      ))}
    </tbody>
  );
}
