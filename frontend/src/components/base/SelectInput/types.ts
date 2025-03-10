export type SelectInputProps = {
  disabled?: boolean;
  label?: string;
  helpertext?: string | undefined;
  value?: string;
  emptylabel?: string;
  error?: boolean;
  size?: 'medium' | 'small';
  options: SelectInputOption[];
  onChange: (value: SelectInputOption) => void;
  isMulti?: boolean;
};

export type SelectInputOption = {
  value: any;
  label: string;
};
