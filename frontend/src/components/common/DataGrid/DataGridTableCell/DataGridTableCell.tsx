import { memo, useEffect, useRef } from 'react';
import { CellContainer, CellContent, CellInput } from '../DataGrid.styled';
import { useCellEditing } from '../hooks/useCellEditing';
import { useCellSelection } from '../hooks/useCellSelection';
import type { DataGridTableCellProps } from '../types';

export const DataGridTableCell = memo(
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
  }: DataGridTableCellProps) => {
    const placeholder = String(value === null ? 'NULL' : value || '');
    const cellValue = String(value || '');
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
      <CellContainer ref={cellRef} onClick={(e: React.MouseEvent): void => handleClick(e, setEditingCell)}>
        <CellContent>{placeholder}</CellContent>
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
