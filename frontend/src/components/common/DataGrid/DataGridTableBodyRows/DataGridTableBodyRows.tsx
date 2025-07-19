import { useDataStore } from '@/store/dataStore/data.store';
import type { JSX } from 'react';
import { useMemo } from 'react';
import type { DataGridTableBodyRowsProps } from '../types';
import DataGridTableRow from './DataGridTableRow/DataGridTableRow';

export default function DataGridTableBodyRows({
  columns,
  rows,
  context,
  editable
}: DataGridTableBodyRowsProps): JSX.Element {
  const editedRows = useDataStore((state) => state.editedRows);
  const removedRows = useDataStore((state) => state.removedRows);
  const unsavedRows = useDataStore((state) => state.unSavedRows);
  const selectedRows = useDataStore((state) => state.selectedRows);

  const removedRowsMap = useMemo(() => new Map(removedRows.map((row) => [row.dbo_index, true])), [removedRows]);
  const unsavedRowsMap = useMemo(() => new Map(unsavedRows.map((row) => [row.dbo_index, true])), [unsavedRows]);
  const editedRowsMap = useMemo(() => new Map(editedRows.map((row) => [row.dboIndex, true])), [editedRows]);
  const selectedRowsMap = useMemo(() => new Map(selectedRows.map((row) => [row.index, true])), [selectedRows]);

  return (
    <tbody>
      {rows.map((row, rowIndex) => {
        const isRemoved = removedRowsMap.has(row.dbo_index);
        const isUnsaved = unsavedRowsMap.has(row.dbo_index);
        const isEdited = editedRowsMap.has(row.dbo_index);
        const isSelected = selectedRowsMap.has(rowIndex);

        return (
          <DataGridTableRow
            key={`row-${row.dbo_index}`}
            editable={editable}
            row={row}
            rowIndex={rowIndex}
            columns={columns}
            context={context}
            isSelected={isSelected}
            isEdited={isEdited}
            isUnsaved={isUnsaved}
            isRemoved={isRemoved}
          />
        );
      })}
    </tbody>
  );
}
