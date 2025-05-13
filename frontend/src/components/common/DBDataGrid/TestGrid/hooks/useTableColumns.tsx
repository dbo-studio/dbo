import { useTableData } from '@/contexts/TableDataContext';
import { handleRowChangeLog } from '@/core/utils';
import type { RowType } from '@/types';
import { Checkbox } from '@mui/material';
import { type JSX, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CellEditingReturn,
  CellSelectionReturn,
  CustomColumnDef,
  MemoizedCellProps,
  RowSelectionReturn,
  TableColumnsProps
} from '../types';
import { CellContainer, CellContent, CellInput } from './../TestGrid.styled';

// Hook for managing cell editing state and behavior
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

  const handleRowChange = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      if (newValue !== cellValue) {
        const newRow = {
          ...row,
          [columnId]: newValue
        };

        const newEditedRows = handleRowChangeLog(editedRows, row, columnId, row[columnId], newValue);

        updateEditedRows(newEditedRows);
        updateRow(newRow);
      }
      setEditingCell(null);
    },
    [row, columnId, cellValue, editedRows, updateEditedRows, updateRow, setEditingCell]
  );

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

// Hook for managing row selection
const useRowSelection = (
  rows: RowType[],
  selectedRows: any[],
  setSelectedRows: (rows: any) => Promise<void>
): RowSelectionReturn => {
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  const handleRowSelection = useCallback(
    (rowIndex: number, isSelected: boolean, event: React.MouseEvent): void => {
      if (event.shiftKey && lastSelectedIndex !== null) {
        const start = Math.min(lastSelectedIndex, rowIndex);
        const end = Math.max(lastSelectedIndex, rowIndex);
        const currentSelected = [...selectedRows];

        for (let i = start; i <= end; i++) {
          const row = rows[i];
          if (!row) continue;

          const existingIndex = currentSelected.findIndex((sr) => sr.index === i);

          if (isSelected && existingIndex === -1) {
            currentSelected.push({
              index: i,
              selectedColumn: '',
              row: row
            });
          } else if (!isSelected && existingIndex !== -1) {
            currentSelected.splice(existingIndex, 1);
          }
        }

        setSelectedRows(currentSelected);
      } else {
        const existingIndex = selectedRows.findIndex((sr) => sr.index === rowIndex);

        if (isSelected && existingIndex === -1) {
          setSelectedRows([
            ...selectedRows,
            {
              index: rowIndex,
              selectedColumn: '',
              row: rows[rowIndex]
            }
          ]);
        } else if (!isSelected && existingIndex !== -1) {
          const newSelectedRows = [...selectedRows];
          newSelectedRows.splice(existingIndex, 1);
          setSelectedRows(newSelectedRows);
        }
      }

      setLastSelectedIndex(rowIndex);
    },
    [lastSelectedIndex, rows, selectedRows, setSelectedRows]
  );

  return {
    handleRowSelection
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
