import { EventFor } from '@/src/types';
import { Box, InputBase, Typography, useTheme } from '@mui/material';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { FieldInputProps } from './types';

export default function FieldInput(props: FieldInputProps) {
  const theme = useTheme();
  const [value, setValue] = useState('');

  useEffect(() => {
    if (props.type == 'date' || props.type == 'date_time') {
      setValue(dayjs('2022-04-17T15:30').format('YYYY-MM-DD'));
    } else {
      setValue(props.value as '');
    }
  }, [props.value]);

  const handleOnChange = (e: EventFor<'input', 'onChange'>) => {
    setValue(e.target.value);
    if (props.onChange) {
      props.onChange(e);
    }
  };

  return (
    <Box>
      <Box display={'flex'} flexDirection={'row'} justifyContent={'space-between'}>
        <Typography color={theme.palette.text.secondary} variant='caption'>
          {props.label}
        </Typography>
        <Typography color={theme.palette.text.secondary} variant='caption'>
          {props.typeLabel}
        </Typography>
      </Box>
      <InputBase
        size='small'
        sx={{ marginBottom: '8px' }}
        fullWidth={props.fullWidth}
        type={props.type}
        value={value}
        onChange={handleOnChange}
      />
    </Box>
  );
}
