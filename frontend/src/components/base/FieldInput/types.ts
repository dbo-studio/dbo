import type { InputBaseProps } from '@mui/material';

export interface FieldInputProps extends InputBaseProps {
  label?: string;
  helpertext?: string | undefined;
  /** Helper color: error (default), success, or muted for plain hints. */
  helpertone?: 'error' | 'success' | 'muted';
  typelabel?: string;
  mb?: number;
}
