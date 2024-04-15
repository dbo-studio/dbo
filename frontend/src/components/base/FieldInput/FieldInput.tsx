import { EventFor } from '@/src/types';
import { Box, InputBase, Typography, useTheme } from '@mui/material';
import dayjs from 'dayjs';
import { forwardRef, useEffect, useState } from 'react';
import { FieldInputProps } from './types';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default forwardRef(function FieldInput(props: FieldInputProps, ref) {
  const theme = useTheme();
  const [value, setValue] = useState('');

  useEffect(() => {
    if (props.type == 'date' || props.type == 'date_time') {
      setValue(dayjs('2022-04-17T15:30').format('YYYY-MM-DD'));
    } else {
      setValue(props.value as '');
    }
  }, [props.type, props.value]);

  const handleOnChange = (e: EventFor<'input', 'onChange'>) => {
    setValue(e.target.value);
    if (props.onChange) {
      props.onChange(e);
    }
  };

  return (
    <Box display={'flex'} flexDirection={'column'}>
      <Box display={'flex'} flexDirection={'row'} justifyContent={'space-between'}>
        <Typography color={theme.palette.text.secondary} variant='caption'>
          {props.label}
        </Typography>
        <Typography color={theme.palette.text.secondary} variant='caption'>
          {props.typeLabel}
        </Typography>
      </Box>
      <InputBase
        size={props.size}
        fullWidth={props.fullWidth}
        type={props.type}
        value={value}
        name={props.name}
        autoComplete='off'
        onChange={handleOnChange}
        sx={{
          borderColor: props.error ? theme.palette.error.light : theme.palette.divider,
          marginBottom: props.error ? '0px' : theme.spacing(1)
        }}
        {...props}
      />
      <Typography mb={theme.spacing(1)} color={theme.palette.error.light} variant='caption'>
        {props.helperText}
      </Typography>
    </Box>
  );
});
