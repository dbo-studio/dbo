import { useDataStore } from '@/store/dataStore/data.store';
import { memo, useEffect, useRef } from 'react';
import { CellContainer, CellContent, CellInput } from '../DataGrid.styled';
import { useCellEditing } from '../hooks/useCellEditing';
import { useCellSelection } from '../hooks/useCellSelection';
import type { DataGridTableCellProps } from '../types';

export const DataGridTableCell = memo(
  ({ row, rowIndex, columnId, value, editedRows, editable }: DataGridTableCellProps) => {
    const cellRef = useRef<HTMLDivElement>(null);
    const updateEditingCell = useDataStore((state) => state.updateEditingCell);
    const editingCell = useDataStore((state) => state.editingCell);
    const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnId === columnId;

    const { inputRef, handleRowChange, localValue, handleInputChange, displayValue } = useCellEditing(row, columnId, value, editedRows);

    const { handleClick } = useCellSelection(row, rowIndex, columnId, editable);

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

    if (isEditing && editable) {
      return (
        <CellInput
          ref={inputRef}
          value={localValue}
          onChange={handleInputChange}
          onBlur={handleRowChange}
          onKeyDown={(e): void => {
            if (e.key === 'Enter' || e.key === 'Escape') {
              e.currentTarget.blur();
            }
          }}
        />
      );
    }

    return (
      <CellContainer ref={cellRef} onClick={(e: React.MouseEvent): void => handleClick(e, updateEditingCell)}>
        <CellContent>{displayValue}</CellContent>
      </CellContainer>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.value === nextProps.value &&
      prevProps.rowIndex === nextProps.rowIndex &&
      prevProps.columnId === nextProps.columnId
    );
  }
);
