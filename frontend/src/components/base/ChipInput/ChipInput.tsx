import { Box, Typography, useTheme } from '@mui/material';
import type { JSX } from 'react';
import type { ActionMeta, MultiValue } from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { chipInputStyles } from './ChipInput.styled';
import type { ChipInputProps, ChipOption } from './types';

export default function ChipInput({
  label,
  value = [],
  onChange,
  placeholder,
  size,
  error,
  helperText,
  disabled
}: ChipInputProps): JSX.Element {
  const theme = useTheme();

  const handleChange = (newValue: MultiValue<ChipOption>, actionMeta: ActionMeta<ChipOption>): void => {
    onChange(newValue ? newValue.map((item) => item.value) : []);
  };

  const handleCreateOption = (inputValue: string): void => {
    // Check if input is a number using regex (including scientific notation and decimals)
    const isNumber = /^-?\d*\.?\d+(e[+-]?\d+)?$/i.test(inputValue);
    const processedValue = isNumber ? String(Number(inputValue)) : inputValue;
    const newValue = [...value, processedValue];
    onChange(newValue);
  };

  const getValue = (): ChipOption[] => {
    return value.map((item: string) => ({
      value: item,
      label: item
    }));
  };

  return (
    <Box display='flex' flexDirection='column' gap={0.5}>
      {label && (
        <Typography color={theme.palette.text.primary} variant='caption'>
          {label}
        </Typography>
      )}
      <CreatableSelect<ChipOption, true>
        isMulti
        isClearable
        value={getValue()}
        options={[]} // Empty options since we only want user created values
        onChange={handleChange}
        onCreateOption={handleCreateOption}
        placeholder={placeholder}
        isDisabled={disabled}
        styles={chipInputStyles(theme, error, size)}
        formatCreateLabel={(inputValue: string): string => `Add "${inputValue}"`}
        noOptionsMessage={(): string => 'Type to add new tags'}
        menuPortalTarget={document.body}
      />
      {helperText && (
        <Typography color={error ? theme.palette.error.main : theme.palette.text.secondary} variant='caption'>
          {helperText}
        </Typography>
      )}
    </Box>
  );
}
