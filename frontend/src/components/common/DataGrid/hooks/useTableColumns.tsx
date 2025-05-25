import { useTableData } from '@/contexts/TableDataContext';
import { handleRowChangeLog } from '@/core/utils';
import type { RowType } from '@/types';
import { Checkbox } from '@mui/material';
import { type JSX, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CellContainer, CellContent, CellInput } from '../DataGrid.styled';
import type {
  CellEditingReturn,
  CellSelectionReturn,
  CustomColumnDef,
  MemoizedCellProps,
  RowSelectionReturn,
  TableColumnsProps
} from '../types';

// Hook for managing row selection with optimized lookups
const useRowSelection = (
  rows: RowType[],
  selectedRows: any[],
  setSelectedRows: (rows: any) => Promise<void>
): RowSelectionReturn => {
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  // Create a Map for O(1) lookups of selected rows
  const selectedRowsMap = useMemo(() => {
    const map = new Map<number, boolean>();
    for (const row of selectedRows) {
      map.set(row.index, true);
    }
    return map;
  }, [selectedRows]);

  const handleRowSelection = useCallback(
    (rowIndex: number, isSelected: boolean, event: React.MouseEvent): void => {
      if (event.shiftKey && lastSelectedIndex !== null) {
        const start = Math.min(lastSelectedIndex, rowIndex);
        const end = Math.max(lastSelectedIndex, rowIndex);
        const currentSelected = new Map(selectedRowsMap);

        // Batch update for shift selection
        const updates: any[] = [];
        for (let i = start; i <= end; i++) {
          const row = rows[i];
          if (!row) continue;

          if (isSelected && !currentSelected.has(i)) {
            updates.push({
              index: i,
              selectedColumn: '',
              row: row
            });
          } else if (!isSelected && currentSelected.has(i)) {
            currentSelected.delete(i);
          }
        }

        if (updates.length > 0) {
          setSelectedRows([...selectedRows, ...updates]);
        } else if (currentSelected.size !== selectedRows.length) {
          setSelectedRows(
            Array.from(currentSelected.entries()).map(([index]) => ({
              index,
              selectedColumn: '',
              row: rows[index]
            }))
          );
        }
      } else {
        // Single row selection
        if (isSelected && !selectedRowsMap.has(rowIndex)) {
          setSelectedRows([
            ...selectedRows,
            {
              index: rowIndex,
              selectedColumn: '',
              row: rows[rowIndex]
            }
          ]);
        } else if (!isSelected && selectedRowsMap.has(rowIndex)) {
          setSelectedRows(selectedRows.filter((sr) => sr.index !== rowIndex));
        }
      }

      setLastSelectedIndex(rowIndex);
    },
    [lastSelectedIndex, rows, selectedRows, selectedRowsMap, setSelectedRows]
  );

  return {
    handleRowSelection
  };
};

// Optimize cell editing with immediate UI updates
const useCellEditing = (
  row: any,
  columnId: string,
  cellValue: string,
  editedRows: any,
  updateEditedRows: (rows: any) => Promise<void>,
  updateRow: (row: any) => Promise<void>,
  setEditingCell: (cell: { rowIndex: number; columnId: string } | null) => void
): CellEditingReturn => {
  const inputRef = useRef<HTMLInputElement>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const handleRowChange = useCallback(
    (e: React.FocusEvent<HTMLInputElement>): void => {
      const newValue = e.target.value;
      if (newValue !== cellValue) {
        const newRow = {
          ...row,
          [columnId]: newValue
        };

        // Update UI immediately
        updateRow(newValue);

        // Clear any pending updates
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }

        // Update IndexedDB in the background
        updateTimeoutRef.current = setTimeout(() => {
          const newEditedRows = handleRowChangeLog(editedRows, row, columnId, row[columnId], newValue);
          Promise.all([updateEditedRows(newEditedRows), updateRow(newRow)]).catch(console.error);
        }, 100);
      }
      setEditingCell(null);
    },
    [row, columnId, cellValue, editedRows, updateEditedRows, updateRow, setEditingCell]
  );

  // Cleanup timeout on unmount
  useEffect((): (() => void) => {
    return (): void => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  return {
    inputRef,
    handleRowChange
  };
};

// Hook for managing cell selection
const useCellSelection = (
  row: any,
  rowIndex: number,
  columnId: string,
  setSelectedRows: (rows: any) => Promise<void>
): CellSelectionReturn => {
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSelect = useCallback(
    (e: React.MouseEvent): void => {
      e.stopPropagation();
      e.preventDefault();

      setSelectedRows([
        {
          index: rowIndex,
          selectedColumn: columnId,
          row
        }
      ]);
    },
    [row, rowIndex, columnId, setSelectedRows]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent, setEditingCell: (cell: { rowIndex: number; columnId: string } | null) => void): void => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;

        setEditingCell({ rowIndex, columnId });
        handleSelect(e);
      } else {
        clickTimeoutRef.current = setTimeout(() => {
          handleSelect(e);
          clickTimeoutRef.current = null;
        }, 250);
      }
    },
    [handleSelect, rowIndex, columnId]
  );

  return {
    handleClick
  };
};

// Memoized Cell component
const MemoizedCell = memo(
  ({
    row,
    rowIndex,
    columnId,
    value,
    isEditing,
    setEditingCell,
    editedRows,
    updateEditedRows,
    updateRow,
    setSelectedRows
  }: MemoizedCellProps) => {
    const cellValue = String(value === null ? 'NULL' : value || '');
    const [isHovering, setIsHovering] = useState(false);
    const cellRef = useRef<HTMLDivElement>(null);

    const { inputRef, handleRowChange } = useCellEditing(
      row,
      columnId,
      cellValue,
      editedRows,
      updateEditedRows,
      updateRow,
      setEditingCell
    );

    const { handleClick } = useCellSelection(row, rowIndex, columnId, setSelectedRows);

    useEffect(() => {
      if (isEditing && inputRef.current) {
        inputRef.current.focus();
      }
    }, [isEditing]);

    useEffect((): (() => void) => {
      const handleClickOutside = (event: MouseEvent): void => {
        if (isEditing && cellRef.current && !cellRef.current.contains(event.target as Node)) {
          if (inputRef.current) {
            inputRef.current.blur();
          }
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return (): void => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isEditing]);

    if (isEditing) {
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
        ref={cellRef}
        className={isHovering ? 'cell-hover' : ''}
        onMouseEnter={(): void => setIsHovering(true)}
        onMouseLeave={(): void => setIsHovering(false)}
        onClick={(e: React.MouseEvent): void => handleClick(e, setEditingCell)}
      >
        <CellContent>{cellValue}</CellContent>
      </CellContainer>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.value === nextProps.value &&
      prevProps.isEditing === nextProps.isEditing &&
      prevProps.rowIndex === nextProps.rowIndex &&
      prevProps.columnId === nextProps.columnId
    );
  }
);

// Main hook for table columns
export default function useTableColumns({
  rows,
  columns,
  editingCell,
  setEditingCell,
  updateEditedRows,
  updateRow,
  editedRows
}: TableColumnsProps): CustomColumnDef[] {
  const { selectedRows, setSelectedRows } = useTableData();
  const { handleRowSelection } = useRowSelection(rows, selectedRows, setSelectedRows);

  return useMemo((): CustomColumnDef[] => {
    const checkboxColumn: CustomColumnDef = {
      id: 'select',
      header: (
        <Checkbox
          sx={{ padding: 0 }}
          size={'small'}
          checked={selectedRows.length === rows.length && rows.length > 0}
          indeterminate={selectedRows.length > 0 && selectedRows.length < rows.length}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
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
            onChange={(e: React.ChangeEvent<HTMLInputElement>, checked: boolean): void => {
              handleRowSelection(rowIndex, checked, e.nativeEvent as unknown as React.MouseEvent);
            }}
            onClick={(e: React.MouseEvent): void => {
              e.stopPropagation();
            }}
          />
        );
      },
      size: 30,
      minSize: 30,
      maxSize: 30
    };

    const dataColumns = columns.map(
      (col) =>
        ({
          id: col.name,
          accessor: col.name,
          header: col.name,
          minSize: 200,
          cell: ({ row, rowIndex, value }): JSX.Element => {
            const columnId = col.name;
            const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnId === columnId;

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
        }) as CustomColumnDef
    );

    return [checkboxColumn, ...dataColumns];
  }, [rows, editingCell, columns, selectedRows, handleRowSelection]);
}
