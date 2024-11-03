import { SelectInputStyles } from '@/components/base/SelectInput/SelectInput.styled.ts';
import type { SelectInputProps } from '@/components/base/SelectInput/types.ts';
import { Box, Typography, useTheme } from '@mui/material';
import Select from 'react-select';

export default function SelectInput({
  label,
  helperText,
  value,
  size,
  options,
  onChange,
  emptyLabel,
  disabled
}: SelectInputProps) {
  const theme = useTheme();

  return (
    <Box display={'flex'} flexDirection={'column'} mb={1}>
      {label && (
        <Typography color={theme.palette.text.text} variant='caption'>
          {label}
        </Typography>
      )}
      <Select
        components={{ IndicatorSeparator: null }}
        placeholder={options.length === 0 && emptyLabel}
        isDisabled={disabled || options.length === 0}
        defaultValue={options.find((option) => option.value === value) ?? ''}
        options={options as any}
        menuPlacement={'auto'}
        onChange={(e) => onChange(e as any)}
        styles={SelectInputStyles(theme, size)}
      />

      <Typography color={theme.palette.error.main} variant='caption'>
        {helperText}
      </Typography>
    </Box>
  );
}
