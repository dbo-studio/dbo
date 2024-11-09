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
  error
}: SelectInputProps) {
  const theme = useTheme();

  return (
    <Box display={'flex'} flexDirection={'column'}>
      {label && (
        <Typography color={theme.palette.text.text} variant='caption'>
          {label}
        </Typography>
      )}
      <Select
        components={{ IndicatorSeparator: null }}
        placeholder={options.length === 0 && emptylabel}
        isDisabled={disabled || options.length === 0}
        defaultValue={options.find((option) => option.value === value) ?? ''}
        value={options.find((option) => option.value === value) ?? ''}
        options={options as any}
        menuPlacement={'auto'}
        onChange={(e) => onChange(e as any)}
        styles={SelectInputStyles(theme, error, size)}
      />

      {helpertext && (
        <Typography color={theme.palette.error.main} variant='caption'>
          {helpertext}
        </Typography>
      )}
    </Box>
  );
}
