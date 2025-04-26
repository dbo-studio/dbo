import { handleRowChangeLog } from '@/core/utils';
import { createColumnHelper } from '@tanstack/react-table';
import { type JSX, useMemo, useState } from 'react';
import { CellContent, CellInput } from './TestGrid.styled';

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
        cell: ({ row, column, getValue }): JSX.Element => {
          const isEditing = editingCell?.rowIndex === row.index && editingCell?.columnId === column.id;
          const [tempValue, setTempValue] = useState(String(getValue()));

          if (isEditing) {
            return (
              <CellInput
                value={tempValue}
                onChange={(e): void => {
                  if (tempValue !== e.target.value) setTempValue(e.target.value);
                }}
                onBlur={(): void => {
                  // biome-ignore lint/suspicious/noDoubleEquals: <explanation>
                  if (tempValue == data[row.index][column.id]) {
                    setEditingCell(null);
                    return;
                  }

                  const newData = [...data];
                  const newRow = {
                    ...newData[row.index],
                    [column.id]: tempValue
                  };
                  newData[row.index] = newRow;

                  const editedRows = handleRowChangeLog(
                    getEditedRows(),
                    row.original,
                    column.id,
                    row.original[column.id],
                    tempValue
                  );

                  updateEditedRows(editedRows);
                  updateRow(newRow);
                  toggleDataFetching();
                  setEditingCell(null);
                }}
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
  }, [data, editingCell, columns, updateEditedRows, updateRow, getEditedRows, toggleDataFetching]);
}
