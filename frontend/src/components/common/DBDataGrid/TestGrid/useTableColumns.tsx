import { handleRowChangeLog } from '@/core/utils';
import { useDataStore } from '@/store/dataStore/data.store';
import type { ColumnType, RowType } from '@/types';
import { type ColumnDef, createColumnHelper } from '@tanstack/react-table';
import { type JSX, useCallback, useMemo, useRef, useState } from 'react';
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
}: {
  data: RowType[];
  columns: any[];
  editingCell: { rowIndex: number; columnId: string } | null;
  setEditingCell: (cell: { rowIndex: number; columnId: string } | null) => void;
  updateEditedRows: (rows: any) => void;
  updateRow: (row: any) => void;
  getEditedRows: () => any;
  toggleDataFetching: () => void;
}): ColumnDef<ColumnType, any>[] {
  const columnHelper = createColumnHelper<ColumnType>();
  const { setSelectedRows } = useDataStore();

  return useMemo((): ColumnDef<ColumnType, any>[] => {
    return columns.map((col) =>
      columnHelper.accessor(col.name, {
        header: col.name,
        cell: ({ row, column, getValue }): JSX.Element => {
          const isEditing = editingCell?.rowIndex === row.index && editingCell?.columnId === column.id;
          const value = String(getValue());
          const [isHovering, setIsHovering] = useState(false);

          const handleEditClick = useCallback((e: React.MouseEvent): void => {
            e.stopPropagation();
            setEditingCell({ rowIndex: row.index, columnId: column.id });
          }, []);

          if (isEditing) {
            const inputRef = useRef<HTMLInputElement>(null);

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
                      //@ts-ignore
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

          const handleSelect = useCallback((e: React.MouseEvent): void => {
            e.stopPropagation();
            e.preventDefault();

            setSelectedRows([
              {
                index: row.index,
                selectedColumn: column.id,
                row: row.original
              }
            ]);
          }, []);

          return (
            <CellContainer
              className={isHovering ? 'cell-hover' : ''}
              onMouseEnter={(): void => setIsHovering(true)}
              onMouseLeave={(): void => setIsHovering(false)}
              onClick={handleSelect}
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
