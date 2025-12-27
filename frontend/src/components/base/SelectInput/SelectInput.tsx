import { SelectInputStyles } from '@/components/base/SelectInput/SelectInput.styled.ts';
import type { SelectInputOption, SelectInputProps } from '@/components/base/SelectInput/types.ts';
import { Box, Typography, useTheme } from '@mui/material';
import type { JSX } from 'react';
import Select from 'react-select';

export default function SelectInput({
  label,
  helpertext,
  value,
  size,
  options,
  onChange,
  emptylabel,
  disabled,
  error,
  isMulti
}: SelectInputProps): JSX.Element {
  const theme = useTheme();

  const getValue = (): SelectInputOption | SelectInputOption[] | null => {
    if (!value) return null;

    if (isMulti) {
      return options.filter((option) => value.includes(option.value as string));
    }
    return options.find((option) => option.value === value) || null;
  };

  return (
    <Box display={'flex'} flexDirection={'column'}>
      {label && (
        <Typography color={theme.palette.text.text} variant='caption'>
          {label}
        </Typography>
      )}
      <Select
        isMulti={isMulti}
        components={{ IndicatorSeparator: null }}
        placeholder={options.length === 0 && emptylabel}
        isDisabled={disabled || options.length === 0}
        value={getValue()}
        options={options}
        menuPlacement={'auto'}
        onChange={onChange}
        styles={SelectInputStyles(theme, error, size)}
        menuPortalTarget={document.body}
      />

      {helpertext && (
        <Typography color={theme.palette.error.main} variant='caption'>
          {helpertext}
        </Typography>
      )}
    </Box>
  );
}
