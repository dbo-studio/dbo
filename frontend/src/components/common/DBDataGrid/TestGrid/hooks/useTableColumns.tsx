import { handleRowChangeLog } from '@/core/utils';
import { useTableData } from '@/contexts/TableDataContext';
import type { ColumnType, RowType } from '@/types';
import { type ColumnDef, createColumnHelper } from '@tanstack/react-table';
import { type JSX, useCallback, useMemo, useRef, useState } from 'react';
import { CellContainer, CellContent, CellInput } from './../TestGrid.styled';
import { Checkbox } from '@mui/material';

export default function useTableColumns({
  rows,
  columns,
  editingCell,
  setEditingCell,
  updateEditedRows,
  updateRow,
  editedRows
}: {
  rows: RowType[];
  columns: ColumnType[];
  editingCell: { rowIndex: number; columnId: string } | null;
  setEditingCell: (cell: { rowIndex: number; columnId: string } | null) => void;
  updateEditedRows: (rows: any) => Promise<void>;
  updateRow: (row: any) => Promise<void>;
  editedRows: any;
}): ColumnDef<ColumnType, any>[] {
  const columnHelper = createColumnHelper<ColumnType>();
  const { selectedRows, setSelectedRows } = useTableData();

  // Track the last selected row index for shift-click selection
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  // Handle row selection with shift key support
  const handleRowSelection = useCallback(
    (rowIndex: number, isSelected: boolean, event: React.MouseEvent): void => {
      // If shift key is pressed and we have a last selected index, select all rows in between
      if (event.shiftKey && lastSelectedIndex !== null) {
        const start = Math.min(lastSelectedIndex, rowIndex);
        const end = Math.max(lastSelectedIndex, rowIndex);

        // Get current selected rows
        const currentSelected = [...selectedRows];

        // Add or remove rows in the range
        for (let i = start; i <= end; i++) {
          const row = rows[i];
          if (!row) continue;

          const existingIndex = currentSelected.findIndex((sr) => sr.index === i);

          if (isSelected && existingIndex === -1) {
            // Add row to selection
            currentSelected.push({
              index: i,
              selectedColumn: '',
              row: row
            });
          } else if (!isSelected && existingIndex !== -1) {
            // Remove row from selection
            currentSelected.splice(existingIndex, 1);
          }
        }

        setSelectedRows(currentSelected);
      } else {
        // Normal selection (toggle)
        const existingIndex = selectedRows.findIndex((sr) => sr.index === rowIndex);

        if (isSelected && existingIndex === -1) {
          // Add to selection
          setSelectedRows([
            ...selectedRows,
            {
              index: rowIndex,
              selectedColumn: '',
              row: rows[rowIndex]
            }
          ]);
        } else if (!isSelected && existingIndex !== -1) {
          // Remove from selection
          const newSelectedRows = [...selectedRows];
          newSelectedRows.splice(existingIndex, 1);
          setSelectedRows(newSelectedRows);
        }
      }

      // Update last selected index
      setLastSelectedIndex(rowIndex);
    },
    [lastSelectedIndex, rows, selectedRows, setSelectedRows]
  );

  return useMemo((): ColumnDef<ColumnType, any>[] => {
    // Create checkbox column
    const checkboxColumn = columnHelper.display({
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          sx={{ padding: 0 }}
          size={'small'}
          checked={selectedRows.length === rows.length && rows.length > 0}
          indeterminate={selectedRows.length > 0 && selectedRows.length < rows.length}
          onChange={(e) => {
            // Select or deselect all rows
            if (e.target.checked) {
              const allRows = rows.map((row, index) => ({
                index,
                selectedColumn: '',
                row
              }));
              setSelectedRows(allRows);
            } else {
              setSelectedRows([]);
            }
          }}
        />
      ),
      cell: ({ row }) => {
        const rowIndex = row.index;
        const isSelected = selectedRows.some((sr) => sr.index === rowIndex);

        return (
          <Checkbox
            sx={{ padding: 0 }}
            size={'small'}
            checked={isSelected}
            onChange={(e, checked) => {
              handleRowSelection(rowIndex, checked, e.nativeEvent as React.MouseEvent);
            }}
            onClick={(e) => {
              // Stop propagation to prevent row selection
              e.stopPropagation();
            }}
          />
        );
      },
      size: 30,
      enableResizing: false // Make checkbox column non-resizable
    });

    // Create data columns
    const dataColumns = columns.map((col) =>
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

              const newEditedRows = handleRowChangeLog(
                editedRows,
                row.original,
                column.id,
                //@ts-ignore
                row.original[column.id],
                newValue
              );

              updateEditedRows(newEditedRows);
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

          // Use a ref to track click timing for distinguishing between single and double clicks
          const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

          // Handle both single and double clicks
          const handleClick = useCallback(
            (e: React.MouseEvent): void => {
              // Clear any existing timeout
              if (clickTimeoutRef.current) {
                clearTimeout(clickTimeoutRef.current);
                clickTimeoutRef.current = null;
                // If we get here, it's a double click, so edit the cell
                setEditingCell({ rowIndex: row.index, columnId: column.id });
                handleSelect(e);
              } else {
                // Set a timeout to handle as a single click
                clickTimeoutRef.current = setTimeout(() => {
                  // This is a single click, so select the row
                  handleSelect(e);
                  clickTimeoutRef.current = null;
                }, 250); // 250ms is a common double-click threshold
              }
            },
            [handleSelect, row.index, column.id]
          );

          return (
            <CellContainer
              className={isHovering ? 'cell-hover' : ''}
              onMouseEnter={(): void => setIsHovering(true)}
              onMouseLeave={(): void => setIsHovering(false)}
              onClick={handleClick}
            >
              <CellContent>{value}</CellContent>
            </CellContainer>
          );
        }
      })
    );

    // Return combined columns array with checkbox first
    return [checkboxColumn, ...dataColumns];
  }, [rows, editingCell, columns, selectedRows, handleRowSelection]);
}
