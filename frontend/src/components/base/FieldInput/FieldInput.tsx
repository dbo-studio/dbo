import type { EventFor } from '@/types';
import { Box, InputBase, Typography, useTheme } from '@mui/material';
import dayjs from 'dayjs';
import { forwardRef, useEffect, useState } from 'react';
import type { FieldInputProps } from './types';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default forwardRef(function FieldInput(props: FieldInputProps, ref) {
  const theme = useTheme();
  const [value, setValue] = useState('');

  useEffect(() => {
    if (props.type === 'date' || props.type === 'date_time') {
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
        <Typography color={theme.palette.text.text} variant='caption'>
          {props.label}
        </Typography>
        <Typography color={theme.palette.text.subdued} variant='caption'>
          {props.typelabel}
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
          borderColor: props.error ? theme.palette.error.main : theme.palette.divider,
          marginBottom: props.error || props.margin === 'none' ? '0px' : theme.spacing(1)
        }}
        {...props}
      />
      <Typography
        mb={props.margin === 'none' ? 0 : theme.spacing(1)}
        color={theme.palette.text.danger}
        variant='caption'
      >
        {props.helperText}
      </Typography>
    </Box>
  );
});
