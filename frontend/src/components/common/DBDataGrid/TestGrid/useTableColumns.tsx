import { handelRowChangeLog } from '@/core/utils';
import { createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';
import { CellContent, CellInput } from './TestGrid.styled';

// biome-ignore lint/nursery/useExplicitType: <explanation>
export default function useTableColumns({
  data,
  columns,
  editingCell,
  setEditingCell,
  updateEditedRows,
  updateRow,
  getEditedRows,
  toggleDataFetching
}) {
  const columnHelper = createColumnHelper();

  return useMemo(() => {
    return columns.map((col) =>
      columnHelper.accessor(col.name, {
        header: col.name,
        size: 100,
        minSize: 50,
        maxSize: 400,
        // biome-ignore lint/nursery/useExplicitType: <explanation>
        cell: ({ row, column, getValue }) => {
          const isEditing = editingCell?.rowIndex === row.index && editingCell?.columnId === column.id;

          if (isEditing) {
            return (
              <CellInput
                value={String(getValue())}
                onChange={(e): void => {
                  const newData = [...data];
                  const newRow = {
                    ...newData[row.index],
                    [column.id]: e.target.value
                  };
                  newData[row.index] = newRow;

                  const editedRows = handelRowChangeLog(
                    getEditedRows(),
                    row.original,
                    column.id,
                    row.original[column.id],
                    e.target.value
                  );

                  updateEditedRows(editedRows);
                  updateRow(newRow);
                  toggleDataFetching();
                }}
                onBlur={(): void => setEditingCell(null)}
                autoFocus
              />
            );
          }

          return (
            <CellContent onDoubleClick={(): void => setEditingCell({ rowIndex: row.index, columnId: column.id })}>
              {String(getValue())}
            </CellContent>
          );
        }
      })
    );
  }, [data, editingCell, columns]);
}
