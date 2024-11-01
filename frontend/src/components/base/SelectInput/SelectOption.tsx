import { MenuItem } from '@mui/material';
import type { SelectOptionProps } from './types';

export default function SelectOption({ value, selected, children }: SelectOptionProps) {
  return (
    <MenuItem selected={selected} value={value}>
      {children}
    </MenuItem>
  );
}
