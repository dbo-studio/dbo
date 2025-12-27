import { OnChangeValue } from 'react-select';

export type SelectInputProps = {
  disabled?: boolean;
  label?: string;
  helpertext?: string | undefined;
  value?: string;
  emptylabel?: string;
  error?: boolean;
  size?: 'medium' | 'small';
  options: SelectInputOption[];
  onChange: (value: OnChangeValue<SelectInputOption, boolean>) => void;
  isMulti?: boolean;
};

export type SelectInputOption = {
  [x: string]: unknown;
  value: unknown;
  label: string;
};
