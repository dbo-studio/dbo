import { memo, useEffect } from 'react';
import { CellContainer, CellContent, CellInput } from '../DataGrid.styled';
import { useCellEditing } from '../hooks/useCellEditing';
import { useCellSelection } from '../hooks/useCellSelection';
import type { DataGridTableCellProps } from '../types';

export const DataGridTableCell = memo(
  ({ row, rowIndex, columnId, value, editable }: DataGridTableCellProps) => {
    const placeholder = String(value === null || value === undefined ? 'NULL' : value);
    const cellValue = String(value == null || value === undefined ? '' : value);

    const { inputRef, handleRowChange } = useCellEditing(row, columnId, cellValue);

    const { handleClick, isEditing, setIsEditing } = useCellSelection(row, rowIndex, columnId, editable);

    useEffect(() => {
      if (isEditing && inputRef.current) {
        inputRef.current.focus();
      }
    }, [isEditing]);

    const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>): void => {
      setIsEditing(false);
      handleRowChange(e);
    };

    if (isEditing && editable) {
      return (
        <CellInput
          ref={inputRef}
          defaultValue={cellValue}
          onBlur={handleInputBlur}
          onKeyDown={(e): void => {
            if (e.key === 'Enter' || e.key === 'Escape') {
              e.currentTarget.blur();
            }
          }}
        />
      );
    }

    return (
      <CellContainer onClick={(e: React.MouseEvent): void => handleClick(e)}>
        <CellContent>{placeholder}</CellContent>
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
