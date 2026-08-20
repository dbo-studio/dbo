import clsx from 'clsx';
import { JSX, memo, useCallback, useEffect, useMemo } from 'react';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import DateTimePicker from '@/components/base/DateTimePicker/DateTimePicker';
import { nextBooleanCellValue, parseBooleanCellValue } from '@/core/utils/dataGrid';
import { formatCellDisplayValue, isComplexMappedType, valueToEditorString } from '@/core/utils/dataValue';
import {
  CellContainer,
  CellContent,
  CellInput,
  CellNullStyled,
  CellNumberStyled,
  CellSelect,
  FkCellView,
  FkLookupButton,
  HighlightedTextMatch
} from '../DataGrid.styled';
import { FkCellEditor } from '../FkCellEditor/FkCellEditor';
import GridCheckbox from '../GridCheckbox';
import { isForeignKeyPickerColumn } from '../hooks/fkColumn';
import { useCellEditing } from '../hooks/useCellEditing';
import { useCellSelection } from '../hooks/useCellSelection';
import type { DataGridTableCellProps } from '../types';

export const DataGridTableCell = memo(
  function DataGridTableCell({
    row,
    rowIndex,
    columnId,
    column,
    value,
    editable,
    searchTerm,
    isSearchMatch,
    isCurrentMatch
  }: DataGridTableCellProps): JSX.Element {
    const mappedType = column?.mappedType ?? 'string';
    const isNull = value === null || value === undefined;
    const isComplex =
      isComplexMappedType(mappedType) ||
      (typeof value === 'object' && value !== null && !Array.isArray(value) && '__dbo' in value);
    const displayValue = formatCellDisplayValue(value, column);
    const editorString = valueToEditorString(value);
    const isFkPicker = isForeignKeyPickerColumn(column);

    const { inputRef, handleRowChange, commitValue, commitFields } = useCellEditing(row, columnId);
    const { handleClick, isEditing, setIsEditing } = useCellSelection(row, rowIndex, columnId, editable);

    const handleCellClick = useCallback(
      (event: React.MouseEvent): void => {
        handleClick(event);
      },
      [handleClick]
    );

    const highlightedContent = useMemo(() => {
      if (!searchTerm || !isSearchMatch) {
        if (isNull) {
          return <CellNullStyled>NULL</CellNullStyled>;
        }
        return <span>{displayValue}</span>;
      }

      const searchLower = searchTerm.toLowerCase();
      const valueLower = displayValue.toLowerCase();
      const parts: Array<{ text: string; isMatch: boolean; start: number }> = [];
      let lastIndex = 0;
      let index = valueLower.indexOf(searchLower, lastIndex);

      while (index !== -1) {
        if (index > lastIndex) {
          parts.push({ text: displayValue.substring(lastIndex, index), isMatch: false, start: lastIndex });
        }
        parts.push({
          text: displayValue.substring(index, index + searchTerm.length),
          isMatch: true,
          start: index
        });
        lastIndex = index + searchTerm.length;
        index = valueLower.indexOf(searchLower, lastIndex);
      }

      if (lastIndex < displayValue.length) {
        parts.push({ text: displayValue.substring(lastIndex), isMatch: false, start: lastIndex });
      }

      return (
        <span>
          {parts.map((part) => (
            <HighlightedTextMatch
              key={`${rowIndex}-${columnId}-${part.start}`}
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
    }, [searchTerm, displayValue, isSearchMatch, isCurrentMatch, rowIndex, columnId, isNull]);

    useEffect(() => {
      if (isEditing && inputRef.current && !isFkPicker) {
        requestAnimationFrame(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        });
      }
    }, [isEditing, inputRef, isFkPicker]);

    const handleInputBlur = useCallback(
      (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>): void => {
        setIsEditing(false);
        if (mappedType === 'number') {
          const trimmed = e.target.value.trim();
          if (trimmed === '') {
            commitValue(null);
            return;
          }
          commitValue(trimmed);
          return;
        }
        if (mappedType === 'boolean') {
          return;
        }
        handleRowChange(e);
      },
      [setIsEditing, handleRowChange, mappedType, commitValue]
    );

    const openFkLookup = useCallback(
      (event: React.MouseEvent): void => {
        event.stopPropagation();
        event.preventDefault();
        if (!editable) {
          return;
        }
        setIsEditing(true);
      },
      [editable, setIsEditing]
    );

    const cellClassName = useMemo(
      () =>
        clsx({
          'is-current-match': isCurrentMatch,
          'is-number': mappedType === 'number',
          'is-null': isNull
        }),
      [isCurrentMatch, mappedType, isNull]
    );

    if (mappedType === 'boolean' && editable) {
      const boolState = parseBooleanCellValue(value);
      return (
        <CellContainer onClick={handleCellClick} className={cellClassName} data-testid='grid-cell-boolean'>
          <GridCheckbox
            checked={boolState === true}
            indeterminate={boolState === null}
            aria-label={columnId}
            aria-checked={boolState === null ? 'mixed' : boolState === true}
            onChange={(): void => {
              commitValue(nextBooleanCellValue(value));
            }}
          />
        </CellContainer>
      );
    }

    if (isEditing && editable && !isComplex) {
      if (isFkPicker && column) {
        return (
          <CellContainer className={cellClassName}>
            <FkCellEditor
              column={column}
              value={value}
              onCommitFields={(updates): void => {
                commitFields(updates);
                setIsEditing(false);
              }}
              onCancel={(): void => {
                setIsEditing(false);
              }}
            />
          </CellContainer>
        );
      }

      if (mappedType === 'enum' && column?.enumValues && column.enumValues.length > 0) {
        return (
          <CellSelect
            autoFocus
            defaultValue={editorString}
            onBlur={handleInputBlur}
            onChange={(e): void => {
              commitValue(e.target.value === '' ? null : e.target.value);
              setIsEditing(false);
            }}
            data-testid='grid-cell-enum'
          >
            {!column.notNull && <option value=''>NULL</option>}
            {column.enumValues.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </CellSelect>
        );
      }

      if (mappedType === 'date' || mappedType === 'time' || mappedType === 'datetime') {
        return (
          <DateTimePicker
            variant='cell'
            mode={mappedType}
            value={value}
            inputRef={inputRef}
            onCommit={(next): void => {
              commitValue(next);
            }}
            onCancelEdit={(): void => {
              setIsEditing(false);
            }}
          />
        );
      }

      return (
        <CellInput
          ref={inputRef}
          type={mappedType === 'number' ? 'number' : 'text'}
          defaultValue={editorString}
          onBlur={handleInputBlur}
          onKeyDown={(e): void => {
            if (e.key === 'Enter' || e.key === 'Escape') {
              e.currentTarget.blur();
            }
          }}
          style={mappedType === 'number' ? { textAlign: 'right' } : undefined}
          data-testid={mappedType === 'json' ? 'grid-cell-json' : undefined}
        />
      );
    }

    const content =
      mappedType === 'number' && !isNull ? (
        <CellNumberStyled>{highlightedContent}</CellNumberStyled>
      ) : (
        highlightedContent
      );

    if (isFkPicker && editable) {
      return (
        <CellContainer onClick={handleCellClick} className={cellClassName} data-testid='grid-cell'>
          <FkCellView>
            <CellContent title={editorString} style={{ flex: 1 }}>
              {content}
            </CellContent>
            <FkLookupButton
              type='button'
              title='Look up foreign key'
              aria-label='Look up foreign key'
              data-testid='grid-fk-lookup-button'
              onClick={openFkLookup}
              onMouseDown={(event): void => {
                event.stopPropagation();
              }}
            >
              <CustomIcon type='search' size='xs' />
            </FkLookupButton>
          </FkCellView>
        </CellContainer>
      );
    }

    return (
      <CellContainer onClick={handleCellClick} className={cellClassName} data-testid='grid-cell'>
        <CellContent title={isComplex ? displayValue : editorString}>{content}</CellContent>
      </CellContainer>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.value === nextProps.value &&
      prevProps.rowIndex === nextProps.rowIndex &&
      prevProps.columnId === nextProps.columnId &&
      prevProps.column?.mappedType === nextProps.column?.mappedType &&
      prevProps.column?.editable === nextProps.column?.editable &&
      prevProps.column?.notNull === nextProps.column?.notNull &&
      prevProps.column?.enumValues === nextProps.column?.enumValues &&
      prevProps.column?.isForeignKey === nextProps.column?.isForeignKey &&
      prevProps.column?.referencedSchema === nextProps.column?.referencedSchema &&
      prevProps.column?.referencedTable === nextProps.column?.referencedTable &&
      prevProps.column?.referencedColumns === nextProps.column?.referencedColumns &&
      prevProps.column?.localColumns === nextProps.column?.localColumns &&
      prevProps.editable === nextProps.editable &&
      prevProps.searchTerm === nextProps.searchTerm &&
      prevProps.isSearchMatch === nextProps.isSearchMatch &&
      prevProps.isCurrentMatch === nextProps.isCurrentMatch
    );
  }
);
