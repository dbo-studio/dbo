import type { BaseSelectProps, SelectVariants } from '@mui/material/Select/Select';
import type React from 'react';

export interface SelectInputProps extends BaseSelectProps {
  variant?: SelectVariants;
  label?: string;
  helperText?: string | undefined;
  children?: React.ReactNode;
}

export type SelectOptionProps = {
  value: string | readonly string[] | number | undefined;
  children?: React.ReactNode;
  selected?: boolean;
};
