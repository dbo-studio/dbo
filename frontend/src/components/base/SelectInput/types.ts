import type { StandardSelectProps } from '@mui/material';
import type React from 'react';

export interface SelectInputProps extends StandardSelectProps {
  label?: string;
  helperText?: string | undefined;
  children?: React.ReactNode;
}

export type SelectOptionProps = {
  value: string | readonly string[] | number | undefined;
  children?: React.ReactNode;
  selected?: boolean;
};
