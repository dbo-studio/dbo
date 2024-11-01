import { Box, Select, Typography, useTheme } from '@mui/material';
import type { SelectInputProps } from './types';

export default function SelectInput(props: SelectInputProps) {
  const theme = useTheme();
  return (
    <Box display={'flex'} flexDirection={'column'}>
      {props.label && (
        <Typography color={theme.palette.text.text} variant='caption'>
          {props.label}
        </Typography>
      )}
      <Select
        variant='standard'
        sx={{
          borderColor: props.error ? theme.palette.error.main : theme.palette.divider,
          marginBottom: props.error || props.margin === 'none' ? '0px' : theme.spacing(1),
          minWidth: 90
        }}
        {...props}
      >
        {props.children}
      </Select>

      <Typography
        mb={props.margin === 'none' ? 0 : theme.spacing(1)}
        color={theme.palette.error.main}
        variant='caption'
      >
        {props.helperText}
      </Typography>
    </Box>
  );
}
