import type { EventFor } from '@/types';
import { Box, Typography, useTheme } from '@mui/material';
import type React from 'react';
import { forwardRef, type JSX, useEffect, useState } from 'react';
import { FieldInputInputStyled, FieldInputLabelRowStyled } from './FieldInput.styled';
import type { FieldInputProps } from './types';

export default forwardRef(function FieldInput(
  props: FieldInputProps,
  forRef: React.Ref<HTMLInputElement>
): JSX.Element {
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
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <FieldInputLabelRowStyled>
        <Typography color={'textText'} variant='caption'>
          {props.label}
        </Typography>
        <Typography color={'textText'} variant='caption'>
          {props.typelabel}
        </Typography>
      </FieldInputLabelRowStyled>
      <FieldInputInputStyled
        ref={forRef}
        spellCheck={'false'}
        value={value}
        autoComplete='off'
        onBlur={handleOnBlur}
        onChange={handleOnChange}
        error={props.error}
        margin={props.margin}
        sx={props.sx}
        {...props}
      />
      {props.helpertext && (
        <Typography
          color={'error'}
          variant='caption'
          sx={{
            mb: theme.spacing(props.mb ?? 0)
          }}
        >
          {props.helpertext}
        </Typography>
      )}
    </Box>
  );
});
