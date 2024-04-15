import { SelectOptionProps } from './types';

export default function SelectOption({ value, selected, children }: SelectOptionProps) {
  return (
    <option selected={selected} value={value}>
      {children}
    </option>
  );
}
