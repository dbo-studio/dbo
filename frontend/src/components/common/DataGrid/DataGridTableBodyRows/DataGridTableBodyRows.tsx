import type { JSX } from 'react';
import { PaddingTableCell } from '../DataGrid.styled';
import { useCellRangeSelection } from '../hooks/useCellRangeSelection';
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
  currentMatch,
  columnWindow,
  renderCell,
  standalone
}: DataGridTableBodyRowsProps & {
  virtualRows: Array<{ index: number; start: number; end: number; size: number }>;
  paddingTop: number;
  paddingBottom: number;
  standalone: boolean;
}): JSX.Element {
  const { getRowState } = useRowStateLookup();
  const rangeHandlers = useCellRangeSelection(columns);

  return (
    <tbody {...(!standalone ? rangeHandlers : undefined)}>
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
            renderCell={renderCell}
            standalone={standalone}
            key={`row-${row.dbo_index}`}
            editable={editable}
            row={row}
            rowIndex={virtualRow.index}
            columns={columns}
            context={context}
            isSelected={rowState.isSelected}
            selectedColumn={rowState.selectedColumn}
            rangeStart={rowState.rangeStart}
            rangeEnd={rowState.rangeEnd}
            rangeEdges={rowState.rangeEdges}
            isEdited={rowState.isEdited}
            isUnsaved={rowState.isUnsaved}
            isRemoved={rowState.isRemoved}
            searchTerm={searchTerm}
            currentMatch={currentMatch}
            columnWindow={columnWindow}
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
