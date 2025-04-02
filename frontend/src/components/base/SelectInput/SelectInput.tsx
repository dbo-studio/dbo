import { SelectInputStyles } from '@/components/base/SelectInput/SelectInput.styled.ts';
import type { SelectInputProps } from '@/components/base/SelectInput/types.ts';
import { Box, Typography, useTheme } from '@mui/material';
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
}: SelectInputProps) {
  const theme = useTheme();

  const handleChange = (selected: any) => {
    onChange(selected);
  };

  const getValue = () => {
    if (!value) return null;

    if (isMulti) {
      return options.filter((option) => value.includes(option.value));
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
        onChange={handleChange}
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
