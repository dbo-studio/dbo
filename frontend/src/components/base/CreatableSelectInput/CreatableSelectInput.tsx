import { SelectInputStyles } from '@/components/base/SelectInput/SelectInput.styled.ts';
import { Box, Typography, useTheme } from '@mui/material';
import { type JSX, useState } from 'react';
import CreatableSelect from 'react-select/creatable';
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
}: CreatableSelectInputProps): JSX.Element {
  const theme = useTheme();

  const [localOptions, setLocalOptions] = useState(options);

  const handleChange = (selected: any): void => {
    console.log('🚀 ~ handleChange ~ selected:', selected);
    onChange(selected);
  };

  const getValue = (): any => {
    if (!value) return null;

    if (isMulti) {
      return localOptions.filter((option) => value.includes(option.value));
    }

    return localOptions.find((option) => option.value === value) || null;
  };

  const handleCreateOption = (inputValue: string) => {
    const newOption = { value: inputValue.toLowerCase(), label: inputValue };
    setLocalOptions([...localOptions, newOption]);

    if (!isMulti) {
      handleChange(newOption);
      return;
    }

    const newValue = [];
    for (const key in (value || []) as string[]) {
      newValue.push({
        value: value?.[key],
        label: value?.[key]
      });
    }

    newValue.push(newOption);

    handleChange(newValue);
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
