import type {EventFor} from '@/types';
import {Box, InputBase, Typography, useTheme} from '@mui/material';
import dayjs from 'dayjs';
import {forwardRef, type JSX, useEffect, useState} from 'react';
import type {FieldInputProps} from './types';

export default forwardRef(function FieldInput(props: FieldInputProps, _): JSX.Element {
  const theme = useTheme();
  const [value, setValue] = useState('');

  useEffect(() => {
    if (props.type === 'date' || props.type === 'date_time' || props.type === 'dateTime') {
      setValue(dayjs('2022-04-17T15:30').format('YYYY-MM-DD'));
    } else {
      setValue(props.value as '');
    }
  }, [props.type, props.value]);

  const handleOnChange = (e: EventFor<'input', 'onChange'>): void => {
    setValue(e.target.value);
    if (props.onChange) {
      props.onChange(e);
    }
  };

  const handleOnBlue = (e: EventFor<'input', 'onBlur'>): void => {
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
        size={props.size}
        fullWidth={props.fullWidth}
        type={props.type}
        value={value}
        name={props.name}
        autoComplete='off'
        onBlur={handleOnBlue}
        onChange={handleOnChange}
        sx={{
          borderColor: props.error ? theme.palette.error.main : theme.palette.divider,
          marginBottom: props.error || props.margin === 'none' ? '0px' : theme.spacing(1)
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
