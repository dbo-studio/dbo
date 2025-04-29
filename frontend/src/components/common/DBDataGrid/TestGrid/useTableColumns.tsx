import { handleRowChangeLog } from '@/core/utils';
import { createColumnHelper } from '@tanstack/react-table';
import { type JSX, useMemo, useRef, useState } from 'react';
import { CellContainer, CellContent, CellInput, EditButton } from './TestGrid.styled';

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

        cell: ({ row, column, getValue }): JSX.Element => {
          const isEditing = editingCell?.rowIndex === row.index && editingCell?.columnId === column.id;
          const value = String(getValue());
          const [isHovering, setIsHovering] = useState(false);

          const handleEditClick = (e): void => {
            e.stopPropagation();
            setEditingCell({ rowIndex: row.index, columnId: column.id });
          };

          if (isEditing) {
            const inputRef = useRef(null);

            // Focus the input when editing starts
            setTimeout(() => {
              if (inputRef.current) {
                inputRef.current.focus();
                inputRef.current.select();
              }
            }, 0);

            return (
              <CellInput
                ref={inputRef}
                defaultValue={value}
                onBlur={(e): void => {
                  const newValue = e.target.value;
                  if (newValue !== value) {
                    const newData = [...data];
                    const newRow = {
                      ...newData[row.index],
                      [column.id]: newValue
                    };
                    newData[row.index] = newRow;

                    const editedRows = handleRowChangeLog(
                      getEditedRows(),
                      row.original,
                      column.id,
                      row.original[column.id],
                      newValue
                    );

                    updateEditedRows(editedRows);
                    updateRow(newRow);
                    toggleDataFetching();
                  }
                  setEditingCell(null);
                }}
                onKeyDown={(e): void => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  } else if (e.key === 'Escape') {
                    setEditingCell(null);
                  }
                }}
              />
            );
          }

          return (
            <CellContainer
              className={isHovering ? 'cell-hover' : ''}
              onMouseEnter={(): void => setIsHovering(true)}
              onMouseLeave={(): void => setIsHovering(false)}
              onClick={(e): void => e.stopPropagation()}
            >
              <CellContent>{value}</CellContent>
              <EditButton onClick={handleEditClick} title='Edit cell'>
                ✎
              </EditButton>
            </CellContainer>
          );
        }
      })
    );
  }, [data, editingCell, columns, updateEditedRows, updateRow, getEditedRows, toggleDataFetching]);
}
