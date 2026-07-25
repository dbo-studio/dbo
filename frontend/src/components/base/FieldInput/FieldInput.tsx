import type { EventFor } from '@/types';
import { Box, Typography, useTheme } from '@mui/material';
import type React from 'react';
import { type JSX, useState } from 'react';
import { FieldInputInputStyled, FieldInputLabelRowStyled } from './FieldInput.styled';
import type { FieldInputProps } from './types';

export default function FieldInput({
  ref,
  label,
  helpertext,
  typelabel,
  value: valueProp,
  type,
  onChange,
  onBlur,
  error,
  margin,
  sx,
  mb,
  ...props
}: FieldInputProps & { ref?: React.Ref<HTMLInputElement> }): JSX.Element {
  const theme = useTheme();
  const [value, setValue] = useState(() => valueProp as string);
  const [prevSync, setPrevSync] = useState({ type, value: valueProp });

  if (prevSync.type !== type || prevSync.value !== valueProp) {
    setPrevSync({ type, value: valueProp });
    setValue(valueProp as string);
  }

  const handleOnChange = (e: EventFor<'input', 'onChange'>): void => {
    setValue(e.target.value);
    onChange?.(e);
  };

  const handleOnBlur = (e: EventFor<'input', 'onBlur'>): void => {
    setValue(e.target.value);
    onBlur?.(e);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <FieldInputLabelRowStyled>
        <Typography color={'textText'} variant='caption'>
          {label}
        </Typography>
        <Typography color={'textText'} variant='caption'>
          {typelabel}
        </Typography>
      </FieldInputLabelRowStyled>
      <FieldInputInputStyled
        ref={ref}
        spellCheck={'false'}
        value={value}
        autoComplete='off'
        onBlur={handleOnBlur}
        onChange={handleOnChange}
        error={error}
        margin={margin}
        sx={sx}
        type={type}
        {...props}
      />
      {helpertext && (
        <Typography
          color={'error'}
          variant='caption'
          sx={{
            mb: theme.spacing(mb ?? 0)
          }}
        >
          {helpertext}
        </Typography>
      )}
    </Box>
  );
}
