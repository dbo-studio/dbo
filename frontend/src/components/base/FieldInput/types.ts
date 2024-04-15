import { InputBaseProps } from '@mui/material';

export interface FieldInputProps extends InputBaseProps {
  label?: string;
  helperText?: string | undefined;
  typeLabel?: string;
}
