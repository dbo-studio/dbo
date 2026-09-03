import { SelectInputStyles } from '@/components/base/SelectInput/SelectInput.styled';
import type { SelectInputOption } from '@/components/base/SelectInput/types';
import { useDataStore } from '@/store/dataStore/data.store';
import type { ColumnType } from '@/types';
import { Box, useTheme } from '@mui/material';
import type { CSSObjectWithLabel, ControlProps, StylesConfig } from 'react-select';
import type { JSX } from 'react';
import { useMemo, useRef } from 'react';
import type { OnChangeValue } from 'react-select';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import {
  canSetFkNull,
  getFkLocalColumns,
  getFkReferencedColumns,
  isCompositeForeignKey,
  isSingleColumnForeignKey
} from '../hooks/fkColumn';
import { NULL_OPTION_VALUE, useFkLookup } from '../hooks/useFkLookup';

type FkCellEditorProps = {
  column: ColumnType;
  value: unknown;
  onCommitFields: (updates: Record<string, unknown>) => void;
  onCancel: () => void;
};

export function FkCellEditor({ column, value, onCommitFields, onCancel }: FkCellEditorProps): JSX.Element {
  const theme = useTheme();
  const allColumns = useDataStore((state) => state.columns ?? []);
  const { options, loading, search } = useFkLookup({ column, enabled: true });
  const committedRef = useRef(false);
  const inputValueRef = useRef('');

  const isComposite = isCompositeForeignKey(column);
  const isSingle = isSingleColumnForeignKey(column);
  const allowNull = canSetFkNull(column, allColumns);
  const localColumns = getFkLocalColumns(column);
  const referencedColumns = getFkReferencedColumns(column);

  const currentValue =
    value === null || value === undefined
      ? null
      : typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
        ? String(value)
        : null;

  const selectOptions = useMemo(() => {
    const base = [...options];
    if (allowNull) {
      base.unshift({ value: NULL_OPTION_VALUE, label: 'NULL' });
    }
    if (isSingle && currentValue && !base.some((option) => String(option.value) === currentValue)) {
      base.unshift({ value: currentValue, label: currentValue });
    }
    return base;
  }, [allowNull, currentValue, isSingle, options]);

  const selected = useMemo(() => {
    if (currentValue === null) {
      return allowNull ? { value: NULL_OPTION_VALUE, label: 'NULL' } : null;
    }
    return (
      selectOptions.find((option) => String(option.value) === currentValue) ?? {
        value: currentValue,
        label: currentValue
      }
    );
  }, [allowNull, currentValue, selectOptions]);

  const finishFields = (updates: Record<string, unknown>): void => {
    if (committedRef.current) {
      return;
    }
    committedRef.current = true;
    onCommitFields(updates);
  };

  const finishNull = (): void => {
    const updates: Record<string, unknown> = {};
    for (const local of localColumns.length ? localColumns : [column.name]) {
      updates[local] = null;
    }
    finishFields(updates);
  };

  const finishSingle = (raw: unknown): void => {
    finishFields({ [column.name]: raw });
  };

  const finishComposite = (fkValues: Record<string, string>): void => {
    const updates: Record<string, unknown> = {};
    referencedColumns.forEach((refCol, index) => {
      const local = localColumns[index];
      if (!local) {
        return;
      }
      updates[local] = fkValues[refCol] ?? null;
    });
    finishFields(updates);
  };

  const handleChange = (option: OnChangeValue<SelectInputOption, false>): void => {
    if (!option) {
      if (allowNull) {
        finishNull();
        return;
      }
      onCancel();
      return;
    }
    if (option.value === NULL_OPTION_VALUE) {
      finishNull();
      return;
    }
    if (option.fkValues) {
      finishComposite(option.fkValues);
      return;
    }
    finishSingle(option.value);
  };

  const baseStyles = SelectInputStyles(theme, false, 'small') as StylesConfig<SelectInputOption, false>;
  const styles: StylesConfig<SelectInputOption, false> = {
    ...baseStyles,
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    control: (base: CSSObjectWithLabel, state: ControlProps<SelectInputOption, false>) => {
      const resolved = typeof baseStyles.control === 'function' ? baseStyles.control(base, state) : base;
      return {
        ...resolved,
        minHeight: 22,
        height: 22
      };
    }
  };

  const noOptionsMessage = isComposite ? (): string => 'No rows' : (): string => 'No rows; paste raw key';

  const sharedProps = {
    autoFocus: true,
    menuIsOpen: true,
    defaultMenuIsOpen: true,
    isClearable: allowNull,
    isLoading: loading,
    options: selectOptions,
    value: selected,
    placeholder: isComposite ? 'Search parent row…' : 'Search or paste key…',
    classNamePrefix: 'grid-fk',
    menuPortalTarget: document.body,
    menuPlacement: 'auto' as const,
    blurInputOnSelect: true,
    noOptionsMessage,
    styles,
    onInputChange: (input: string, meta: { action: string }): string => {
      if (meta.action === 'input-change') {
        inputValueRef.current = input;
        search(input);
      }
      return input;
    },
    onChange: handleChange,
    onKeyDown: (event: React.KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        committedRef.current = true;
        onCancel();
      }
    }
  };

  return (
    <Box data-testid='grid-cell-fk' sx={{ width: '100%', minWidth: 160 }}>
      {isComposite ? (
        <Select
          {...sharedProps}
          onBlur={(): void => {
            if (!committedRef.current) {
              onCancel();
            }
          }}
        />
      ) : (
        <CreatableSelect
          {...sharedProps}
          formatCreateLabel={(input): string => `Use "${input}"`}
          onCreateOption={(input): void => {
            finishSingle(input);
          }}
          onBlur={(): void => {
            if (committedRef.current) {
              return;
            }
            const typed = inputValueRef.current.trim();
            if (typed !== '') {
              finishSingle(typed);
              return;
            }
            onCancel();
          }}
        />
      )}
    </Box>
  );
}
