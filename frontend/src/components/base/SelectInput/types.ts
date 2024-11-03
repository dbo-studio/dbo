export type SelectInputProps = {
  disabled?: boolean;
  label?: string;
  helperText?: string | undefined;
  value?: string;
  emptyLabel?: string;
  size?: 'medium' | 'small';
  options: SelectInputOption[];
  onChange: (value: SelectInputOption) => void;
};

export type SelectInputOption = {
  value: any;
  label: string;
};
