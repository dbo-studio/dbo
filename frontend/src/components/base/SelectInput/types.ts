import { NativeSelectProps } from '@mui/material';
import React from 'react';

export interface SelectInputProps extends NativeSelectProps {
  label?: string;
  helperText?: string | undefined;
  children?: React.ReactNode;
}

export type SelectOptionProps = {
  value: string | readonly string[] | number | undefined;
  children?: React.ReactNode;
  selected?: boolean;
};
