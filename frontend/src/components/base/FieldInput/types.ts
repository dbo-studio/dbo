import type { InputBaseProps } from '@mui/material';

export interface FieldInputProps extends InputBaseProps {
  label?: string;
  helpertext?: string | undefined;
  typelabel?: string;
  mb?: number;
}
