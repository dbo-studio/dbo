import type { JSX } from 'react';
import { PaddingTableCell } from '../DataGrid.styled';
import { useRowStateLookup } from '../hooks/useRowStateLookup';
import type { DataGridTableBodyRowsProps } from '../types';
import DataGridTableRow from './DataGridTableRow/DataGridTableRow';

export default function DataGridTableBodyRows({
  columns,
  rows,
  context,
  editable,
  virtualRows,
  paddingTop,
  paddingBottom,
  searchTerm,
  currentMatch
}: DataGridTableBodyRowsProps & {
  virtualRows: Array<{ index: number; start: number; end: number; size: number }>;
  paddingTop: number;
  paddingBottom: number;
}): JSX.Element {
  const { getRowState } = useRowStateLookup();

  return (
    <tbody>
      {paddingTop > 0 && (
        <tr>
          <PaddingTableCell colSpan={columns.length} height={paddingTop} />
        </tr>
      )}
      {virtualRows.map((virtualRow) => {
        const row = rows[virtualRow.index];
        if (!row) return null;

        const rowState = getRowState(row.dbo_index, virtualRow.index);

        return (
          <DataGridTableRow
            key={`row-${row.dbo_index}`}
            editable={editable}
            row={row}
            rowIndex={virtualRow.index}
            columns={columns}
            context={context}
            isSelected={rowState.isSelected}
            isEdited={rowState.isEdited}
            isUnsaved={rowState.isUnsaved}
            isRemoved={rowState.isRemoved}
            searchTerm={searchTerm}
            currentMatch={currentMatch}
          />
        );
      })}
      {paddingBottom > 0 && (
        <tr>
          <PaddingTableCell colSpan={columns.length} height={paddingBottom} />
        </tr>
      )}
    </tbody>
  );
}
