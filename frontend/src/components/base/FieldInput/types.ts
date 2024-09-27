import type { InputBaseProps } from '@mui/material';

export interface FieldInputProps extends InputBaseProps {
  label?: string;
  helperText?: string | undefined;
  typelabel?: string;
}
