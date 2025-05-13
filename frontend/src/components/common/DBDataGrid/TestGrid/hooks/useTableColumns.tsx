import { handleRowChangeLog } from '@/core/utils';
import { useTableData } from '@/contexts/TableDataContext';
import type { ColumnType, RowType } from '@/types';
import { type JSX, memo, useCallback, useMemo, useRef, useState } from 'react';
import { CellContainer, CellContent, CellInput } from './../TestGrid.styled';
import { Checkbox } from '@mui/material';

// Memoized Cell component to prevent unnecessary re-renders
const MemoizedCell = memo(
  ({ 
    row, 
    rowIndex, 
    columnId, 
    value, 
    isEditing, 
    editingCell, 
    setEditingCell, 
    editedRows, 
    updateEditedRows, 
    updateRow, 
    setSelectedRows 
  }: { 
    row: any; 
    rowIndex: number; 
    columnId: string; 
    value: any; 
    isEditing: boolean; 
    editingCell: { rowIndex: number; columnId: string } | null;
    setEditingCell: (cell: { rowIndex: number; columnId: string } | null) => void;
    editedRows: any;
    updateEditedRows: (rows: any) => Promise<void>;
    updateRow: (row: any) => Promise<void>;
    setSelectedRows: (rows: any) => Promise<void>;
  }) => {
    const cellValue = String(value || '');
    const [isHovering, setIsHovering] = useState(false);

    const handleEditClick = useCallback((e: React.MouseEvent): void => {
      e.stopPropagation();
      setEditingCell({ rowIndex, columnId });
    }, [rowIndex, columnId, setEditingCell]);

    const handleRowChange = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      if (newValue !== cellValue) {
        const newRow = {
          ...row,
          [columnId]: newValue
        };

        const newEditedRows = handleRowChangeLog(
          editedRows,
          row,
          columnId,
          row[columnId],
          newValue
        );

        updateEditedRows(newEditedRows);
        updateRow(newRow);
      }
      setEditingCell(null);
    }, [row, columnId, cellValue, editedRows, updateEditedRows, updateRow, setEditingCell]);

    const handleSelect = useCallback((e: React.MouseEvent): void => {
      e.stopPropagation();
      e.preventDefault();

      setSelectedRows([
        {
          index: rowIndex,
          selectedColumn: columnId,
          row
        }
      ]);
    }, [row, rowIndex, columnId, setSelectedRows]);

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
          setEditingCell({ rowIndex, columnId });
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
      [handleSelect, rowIndex, columnId, setEditingCell]
    );

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
          defaultValue={cellValue}
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

    return (
      <CellContainer
        className={isHovering ? 'cell-hover' : ''}
        onMouseEnter={(): void => setIsHovering(true)}
        onMouseLeave={(): void => setIsHovering(false)}
        onClick={handleClick}
      >
        <CellContent>{cellValue}</CellContent>
      </CellContainer>
    );
  },
  // Custom comparison function to prevent unnecessary re-renders
  (prevProps, nextProps) => {
    return (
      prevProps.value === nextProps.value &&
      prevProps.isEditing === nextProps.isEditing &&
      prevProps.rowIndex === nextProps.rowIndex &&
      prevProps.columnId === nextProps.columnId
    );
  }
);

// Define our custom column definition type
export interface CustomColumnDef {
  id: string;
  header: JSX.Element | string;
  accessor?: string;
  cell: (props: { row: any; rowIndex: number; value: any }) => JSX.Element;
  size?: number;
  minSize?: number;
  maxSize?: number;
}

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
}): CustomColumnDef[] {
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

  return useMemo((): CustomColumnDef[] => {
    // Create checkbox column
    const checkboxColumn: CustomColumnDef = {
      id: 'select',
      header: (
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
      cell: ({ rowIndex }) => {
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
      minSize: 30,
      maxSize: 30
    };

    // Create data columns
    const dataColumns = columns.map((col) => {
      return {
        id: col.name,
        accessor: col.name,
        header: col.name,
        minSize: 200,
        cell: ({ row, rowIndex, value }): JSX.Element => {
          const columnId = col.name;
          const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnId === columnId;

          // Use the MemoizedCell component instead of directly rendering
          return (
            <MemoizedCell
              row={row}
              rowIndex={rowIndex}
              columnId={columnId}
              value={value}
              isEditing={isEditing}
              editingCell={editingCell}
              setEditingCell={setEditingCell}
              editedRows={editedRows}
              updateEditedRows={updateEditedRows}
              updateRow={updateRow}
              setSelectedRows={setSelectedRows}
            />
          );
        }
      } as CustomColumnDef;
    });

    // Return combined columns array with checkbox first
    return [checkboxColumn, ...dataColumns];
  }, [rows, editingCell, columns, selectedRows, handleRowSelection]);
}
