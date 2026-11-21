import { TextField } from '@mui/material';
import type { JSX } from 'react';

export default function Cell({
  value,
  editable,
  onChange
}: {
  value: string;
  editable: boolean;
  onChange: (v: string) => void;
}): JSX.Element {
  return editable ? (
    <TextField variant='standard' value={value} onChange={(e): void => onChange(e.target.value)} fullWidth />
  ) : (
    <>{value}</>
  );
}
