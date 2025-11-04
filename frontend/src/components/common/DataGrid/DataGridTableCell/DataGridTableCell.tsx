import clsx from 'clsx';
import { memo, useEffect, useMemo } from 'react';
import { CellContainer, CellContent, CellInput, HighlightedTextMatch } from '../DataGrid.styled';
import { useCellEditing } from '../hooks/useCellEditing';
import { useCellSelection } from '../hooks/useCellSelection';
import type { DataGridTableCellProps } from '../types';

export const DataGridTableCell = memo(
  ({ row, rowIndex, columnId, value, editable, searchTerm, isSearchMatch, isCurrentMatch }: DataGridTableCellProps) => {
    const placeholder = String(value === null || value === undefined ? 'NULL' : value);
    const cellValue = String(value == null || value === undefined ? '' : value);

    const { inputRef, handleRowChange } = useCellEditing(row, columnId, cellValue);

    const { handleClick, isEditing, setIsEditing } = useCellSelection(row, rowIndex, columnId, editable);

    // Highlight search term in cell content
    const highlightedContent = useMemo(() => {
      if (!searchTerm || !isSearchMatch) {
        return <span>{placeholder}</span>;
      }

      const searchLower = searchTerm.toLowerCase();
      const valueLower = placeholder.toLowerCase();
      const parts: Array<{ text: string; isMatch: boolean }> = [];
      let lastIndex = 0;
      let index = valueLower.indexOf(searchLower, lastIndex);

      while (index !== -1) {
        if (index > lastIndex) {
          parts.push({ text: placeholder.substring(lastIndex, index), isMatch: false });
        }
        parts.push({ text: placeholder.substring(index, index + searchTerm.length), isMatch: true });
        lastIndex = index + searchTerm.length;
        index = valueLower.indexOf(searchLower, lastIndex);
      }

      if (lastIndex < placeholder.length) {
        parts.push({ text: placeholder.substring(lastIndex), isMatch: false });
      }

      return (
        <span>
          {parts.map((part, index) => (
            <HighlightedTextMatch
              key={`${rowIndex}-${columnId}-${index}-${part.text}`}
              className={clsx({
                'is-match': part.isMatch,
                'is-current-match': part.isMatch && isCurrentMatch
              })}
            >
              {part.text}
            </HighlightedTextMatch>
          ))}
        </span>
      );
    }, [searchTerm, placeholder, isSearchMatch, isCurrentMatch, rowIndex, columnId]);

    useEffect(() => {
      if (isEditing && inputRef.current) {
        inputRef.current.focus();
      }
    }, [isEditing]);

    const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>): void => {
      setIsEditing(false);
      handleRowChange(e);
    };

    const cellClassName = useMemo(
      () => clsx({
        'is-current-match': isCurrentMatch
      }),
      [isCurrentMatch]
    );

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
      <CellContainer onClick={(e: React.MouseEvent): void => handleClick(e)} className={cellClassName}>
        <CellContent>{highlightedContent}</CellContent>
      </CellContainer>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.value === nextProps.value &&
      prevProps.rowIndex === nextProps.rowIndex &&
      prevProps.columnId === nextProps.columnId &&
      prevProps.searchTerm === nextProps.searchTerm &&
      prevProps.isSearchMatch === nextProps.isSearchMatch &&
      prevProps.isCurrentMatch === nextProps.isCurrentMatch
    );
  }
);
