import { SelectInputStyles } from '@/components/base/SelectInput/SelectInput.styled.ts';
import { Box, Typography, useTheme } from '@mui/material';
import React, { useMemo, useState } from 'react';
import type { ActionMeta } from 'react-select';
import CreatableSelect from 'react-select/creatable';
import type { SelectInputOption } from '../SelectInput/types';
import type { CreatableSelectInputProps } from './types';

export default function CreatableSelectInput({
  label,
  helpertext,
  value,
  size,
  options,
  onChange,
  emptylabel,
  error,
  isMulti,
  isLoading
}: CreatableSelectInputProps): React.JSX.Element {
  const theme = useTheme();

  const [createdOptions, setCreatedOptions] = useState<SelectInputOption[]>([]);

  const localOptions = useMemo(() => {
    const optionValues = new Set(options.map((option) => option.value));
    const uniqueCreated = createdOptions.filter((option) => !optionValues.has(option.value));
    return [...options, ...uniqueCreated];
  }, [options, createdOptions]);

  const handleChange = (selected: unknown, _actionMeta: ActionMeta<unknown>): void => {
    void _actionMeta;
    onChange(selected as SelectInputOption | SelectInputOption[] | null);
  };

  const getValue = (): SelectInputOption | SelectInputOption[] | null => {
    if (value === null || value === undefined) return null;

    if (isMulti) {
      if (!Array.isArray(value)) {
        return [];
      }

      return value.map((val) => {
        const found = localOptions.find((option) => option.value === val);
        return found || { value: val, label: val };
      });
    }

    if (Array.isArray(value)) {
      console.debug('[CreatableSelectInput] Invalid format for single-select: expected string, got array');
      const firstValue = value.length > 0 ? value[0] : null;
      if (!firstValue) return null;
      const found = localOptions.find((option) => option.value === firstValue);
      return found || { value: firstValue, label: firstValue };
    }
    const found = localOptions.find((option) => option.value === value);

    return found || { value: value, label: value };
  };

  const handleCreateOption = (inputValue: string): void => {
    const newOption = { value: inputValue.toLowerCase(), label: inputValue };
    const updatedOptions = [...localOptions, newOption];
    setCreatedOptions((previous) => [...previous, newOption]);

    if (!isMulti) {
      handleChange(newOption, { action: 'create-option' } as ActionMeta<unknown>);
      return;
    }

    if (!Array.isArray(value)) {
      console.error(
        '[CreatableSelectInput] Invalid format for multi-select in handleCreateOption: expected array, got',
        typeof value
      );
      handleChange([newOption], { action: 'create-option' } as ActionMeta<unknown>);
      return;
    }

    const currentValueArray = value;
    const newValueArray = currentValueArray.map((val) => {
      const existingOption = updatedOptions.find((opt) => opt.value === val);
      return existingOption || { value: val, label: String(val) };
    });

    newValueArray.push(newOption);
    handleChange(newValueArray, { action: 'create-option' } as ActionMeta<unknown>);
  };

  return (
    <Box
      className={'creatable'}
      sx={{
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {label && (
        <Typography color={theme.palette.text.text} variant='caption'>
          {label}
        </Typography>
      )}
      <CreatableSelect
        isLoading={isLoading}
        isMulti={isMulti}
        placeholder={options.length === 0 && emptylabel}
        components={{ IndicatorSeparator: null }}
        value={getValue()}
        options={localOptions}
        menuPlacement={'auto'}
        onChange={handleChange}
        styles={SelectInputStyles(theme, error, size)}
        menuPortalTarget={document.body}
        onCreateOption={handleCreateOption}
        isClearable={true}
      />
      {helpertext && (
        <Typography
          color={theme.palette.error.main}
          variant='caption'
          sx={{ marginBottom: (theme) => theme.spacing(1) }}
        >
          {helpertext}
        </Typography>
      )}
    </Box>
  );
}
