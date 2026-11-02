import { SelectInputStyles } from '@/components/base/SelectInput/SelectInput.styled.ts';
import type { SelectInputOption, SelectInputProps } from '@/components/base/SelectInput/types.ts';
import { Box, Typography, useTheme } from '@mui/material';
import type { JSX } from 'react';
import Select, { components, type InputProps } from 'react-select';
import { PASSWORD_MANAGER_OFF } from '../FieldInput/FieldInput';

const SelectSearchInput = (props: InputProps<SelectInputOption, boolean>): JSX.Element => (
  <components.Input {...props} autoComplete='off' {...PASSWORD_MANAGER_OFF} />
);

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
  isMulti,
  style,
  formatOptionLabel,
  onMenuOpen,
  menuPlacement = 'auto',
  testId,
  classNamePrefix
}: SelectInputProps): JSX.Element {
  const theme = useTheme();

  const getValue = (): SelectInputOption | SelectInputOption[] | null => {
    if (value === undefined || value === null || value === '') return null;

    if (isMulti) {
      return options.filter((option) => value.includes(option.value as string));
    }
    return options.find((option) => option.value === value) || null;
  };

  return (
    <Box
      data-testid={testId}
      style={style}
      sx={{
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {label && (
        <Typography color={theme.palette.text.text} variant='caption' sx={{ mb: '4px' }}>
          {label}
        </Typography>
      )}
      <Select
        isMulti={isMulti}
        components={{ IndicatorSeparator: null, Input: SelectSearchInput }}
        placeholder={options.length === 0 && emptylabel}
        isDisabled={disabled || options.length === 0}
        value={getValue()}
        options={options}
        menuPlacement={menuPlacement}
        onChange={onChange}
        onMenuOpen={onMenuOpen}
        formatOptionLabel={formatOptionLabel}
        classNamePrefix={classNamePrefix}
        styles={SelectInputStyles(theme, error, size)}
        menuPortalTarget={document.body}
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
