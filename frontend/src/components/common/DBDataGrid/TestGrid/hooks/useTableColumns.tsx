import { handleRowChangeLog } from '@/core/utils';
import { useDataStore } from '@/store/dataStore/data.store';
import type { ColumnType, RowType } from '@/types';
import { type ColumnDef, createColumnHelper } from '@tanstack/react-table';
import { type JSX, useCallback, useMemo, useRef, useState } from 'react';
import { CellContainer, CellContent, CellInput, EditButton } from './../TestGrid.styled';

export default function useTableColumns({
  rows,
  columns,
  editingCell,
  setEditingCell,
  updateEditedRows,
  updateRow,
  getEditedRows
}: {
  rows: RowType[];
  columns: ColumnType[];
  editingCell: { rowIndex: number; columnId: string } | null;
  setEditingCell: (cell: { rowIndex: number; columnId: string } | null) => void;
  updateEditedRows: (rows: any) => void;
  updateRow: (row: any) => void;
  getEditedRows: () => any;
}): ColumnDef<ColumnType, any>[] {
  const columnHelper = createColumnHelper<ColumnType>();
  const { setSelectedRows } = useDataStore();

  return useMemo((): ColumnDef<ColumnType, any>[] => {
    return columns.map((col) =>
      //@ts-ignore
      columnHelper.accessor(col.name, {
        header: col.name,
        maxSize: 400,
        cell: ({ row, column, getValue }): JSX.Element => {
          const isEditing = editingCell?.rowIndex === row.index && editingCell?.columnId === column.id;
          const value = String(getValue());
          const [isHovering, setIsHovering] = useState(false);

          const handleEditClick = useCallback((e: React.MouseEvent): void => {
            e.stopPropagation();
            setEditingCell({ rowIndex: row.index, columnId: column.id });
          }, []);

          const handleRowChange = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
            const newValue = e.target.value;
            if (newValue !== value) {
              const newRow = {
                ...rows[row.index],
                [column.id]: newValue
              };

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
            }
            setEditingCell(null);
          }, []);

          if (isEditing) {
            const inputRef = useRef<HTMLInputElement>(null);

            setTimeout(() => {
              if (inputRef.current) {
                inputRef.current.focus();
              }
            }, 0);

            return (
              <CellInput
                ref={inputRef}
                defaultValue={value}
                onBlur={handleRowChange}
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
  }, [rows, editingCell, columns]);
}
