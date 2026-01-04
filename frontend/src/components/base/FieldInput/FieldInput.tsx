import type { EventFor } from '@/types';
import { Box, InputBase, Typography, useTheme } from '@mui/material';
import type React from 'react';
import { forwardRef, type JSX, useEffect, useState } from 'react';
import type { FieldInputProps } from './types';

/* eslint-disable @typescript-eslint/no-unused-vars */
export default forwardRef(function FieldInput(props: FieldInputProps, _: React.Ref<HTMLInputElement>): JSX.Element {
  const theme = useTheme();
  const [value, setValue] = useState('');

  useEffect(() => {
    setValue(props.value as '');
  }, [props.type, props.value]);

  const handleOnChange = (e: EventFor<'input', 'onChange'>): void => {
    setValue(e.target.value);
    if (props.onChange) {
      props.onChange(e);
    }
  };

  const handleOnBlur = (e: EventFor<'input', 'onBlur'>): void => {
    setValue(e.target.value);
    if (props.onBlur) {
      props.onBlur(e);
    }
  };

  return (
    <Box display={'flex'} flexDirection={'column'}>
      <Box display={'flex'} flexDirection={'row'} justifyContent={'space-between'}>
        <Typography color={'textText'} variant='caption'>
          {props.label}
        </Typography>
        <Typography color={'textText'} variant='caption'>
          {props.typelabel}
        </Typography>
      </Box>
      <InputBase
        spellCheck={'false'}
        value={value}
        autoComplete='off'
        onBlur={handleOnBlur}
        onChange={handleOnChange}
        sx={{
          borderColor: props.error ? theme.palette.error.main : theme.palette.divider,
          marginBottom: props.error || props.margin === 'none' ? '0px' : theme.spacing(1),
          ...props.sx
        }}
        {...props}
      />
      {props.helpertext && (
        <Typography mb={theme.spacing(props.mb ?? 0)} color={'error'} variant='caption'>
          {props.helpertext}
        </Typography>
      )}
    </Box>
  );
});
