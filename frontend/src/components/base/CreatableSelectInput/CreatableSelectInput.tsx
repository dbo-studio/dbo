import { SelectInputStyles } from '@/components/base/SelectInput/SelectInput.styled.ts';
import { Box, Typography, useTheme } from '@mui/material';
import React, { useEffect, useState } from 'react';
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
  isMulti
}: CreatableSelectInputProps): React.JSX.Element {
  const theme = useTheme();

  const [localOptions, setLocalOptions] = useState(options);

  useEffect(() => {
    setLocalOptions(options);
  }, [options]);

  const handleChange = (selected: unknown, _actionMeta: ActionMeta<unknown>): void => {
    // actionMeta is required by react-select but we don't use it - eslint-disable-next-line is handled by prefix _
    void _actionMeta;
    onChange(selected as SelectInputOption | SelectInputOption[] | null);
  };

  const getValue = (): SelectInputOption | SelectInputOption[] | null => {
    if (value === null || value === undefined) return null;

    if (isMulti) {
      // Multi-select must always be array (validated in useFormData)
      if (!Array.isArray(value)) {
        console.error('[CreatableSelectInput] Invalid format for multi-select: expected array, got', typeof value);
        return [];
      }
      // Map each value to its option, creating one if it doesn't exist (for newly created options)
      return (value as string[]).map((val) => {
        const found = localOptions.find((option) => option.value === val);
        return found || { value: val, label: val };
      });
    }

    // For single select, value should be string
    if (Array.isArray(value)) {
      console.error('[CreatableSelectInput] Invalid format for single-select: expected string, got array');
      const firstValue = value.length > 0 ? value[0] : null;
      if (!firstValue) return null;
      const found = localOptions.find((option) => option.value === firstValue);
      return found || { value: firstValue, label: firstValue };
    }
    const found = localOptions.find((option) => option.value === value);
    // If option not found in localOptions, create one (for newly created options)
    return found || { value: value as string, label: value as string };
  };

  const handleCreateOption = (inputValue: string): void => {
    const newOption = { value: inputValue.toLowerCase(), label: inputValue };
    const updatedOptions = [...localOptions, newOption];
    setLocalOptions(updatedOptions);

    // react-select automatically calls onChange after onCreateOption,
    // but we need to ensure the new option is available in localOptions
    // So we manually trigger onChange to ensure the value is set correctly
    if (!isMulti) {
      // For single select, directly set the new option
      handleChange(newOption, { action: 'create-option' } as ActionMeta<unknown>);
      return;
    }

    // Multi-select must always be array (validated in useFormData)
    if (!Array.isArray(value)) {
      console.error(
        '[CreatableSelectInput] Invalid format for multi-select in handleCreateOption: expected array, got',
        typeof value
      );
      handleChange([newOption], { action: 'create-option' } as ActionMeta<unknown>);
      return;
    }

    // Create new array with existing values and new option
    // Use updatedOptions to get labels for existing values
    const currentValueArray = value as string[];
    const newValueArray = currentValueArray.map((val) => {
      const existingOption = updatedOptions.find((opt) => opt.value === val);
      return existingOption || { value: val, label: String(val) };
    });

    newValueArray.push(newOption);
    handleChange(newValueArray, { action: 'create-option' } as ActionMeta<unknown>);
  };

  return (
    <Box display={'flex'} flexDirection={'column'} className={'creatable'}>
      {label && (
        <Typography color={theme.palette.text.text} variant='caption'>
          {label}
        </Typography>
      )}
      <CreatableSelect
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
        <Typography color={theme.palette.error.main} variant='caption'>
          {helpertext}
        </Typography>
      )}
    </Box>
  );
}
