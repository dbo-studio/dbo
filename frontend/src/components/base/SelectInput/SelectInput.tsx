import { Box, NativeSelect, Typography, useTheme } from '@mui/material';
import { forwardRef } from 'react';
import type { SelectInputProps } from './types'; // eslint-disable-next-line @typescript-eslint/no-unused-vars

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default forwardRef(function SelectInput(props: SelectInputProps, ref) {
  const theme = useTheme();
  return (
    <Box display={'flex'} flexDirection={'column'}>
      {props.label && (
        <Typography color={theme.palette.text.text} variant='caption'>
          {props.label}
        </Typography>
      )}
      <NativeSelect
        sx={{
          borderColor: props.error ? theme.palette.error.main : theme.palette.divider,
          marginBottom: props.error || props.margin === 'none' ? '0px' : theme.spacing(1),
          minWidth: 90
        }}
        {...props}
      >
        {props.children}
      </NativeSelect>

      <Typography
        mb={props.margin === 'none' ? 0 : theme.spacing(1)}
        color={theme.palette.error.main}
        variant='caption'
      >
        {props.helperText}
      </Typography>
    </Box>
  );
});
