import { type Table, flexRender } from '@tanstack/react-table';
import type { JSX } from 'react';
import { Resizer, StyledTableRow, TableHeader } from './TestGrid.styled';

export default function TableHeaderRow<T>({
  table
}: {
  table: Table<T>;
}): JSX.Element {
  return (
    <thead
      style={{
        display: 'grid',
        position: 'sticky',
        top: 0,
        zIndex: 1
      }}
    >
      {table.getHeaderGroups().map((headerGroup) => (
        <StyledTableRow key={headerGroup.id}>
          {headerGroup.headers.map((header) => (
            <TableHeader
              key={header.id}
              colSpan={header.colSpan}
              style={{
                width: `${header.getSize()}px`,
                position: 'relative'
              }}
            >
              {flexRender(header.column.columnDef.header, header.getContext())}
              {header.column.getCanResize() && (
                <Resizer
                  onMouseDown={header.getResizeHandler()}
                  onTouchStart={header.getResizeHandler()}
                  className={`resizer ${header.column.getIsResizing() ? 'isResizing' : ''}`}
                />
              )}
            </TableHeader>
          ))}
        </StyledTableRow>
      ))}
    </thead>
  );
}
