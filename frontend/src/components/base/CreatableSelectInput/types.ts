import type { SelectInputOption } from '../SelectInput/types';

export type CreatableSelectInputProps = {
  label?: string;
  helpertext?: string | undefined;
  value?: string | string[];
  emptylabel?: string;
  error?: boolean;
  size?: 'medium' | 'small';
  options: SelectInputOption[];
  onChange: (value: SelectInputOption) => void;
  isMulti?: boolean;
};

