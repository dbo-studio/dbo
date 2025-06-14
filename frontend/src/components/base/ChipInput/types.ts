export interface ChipInputProps {
  label?: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  size?: 'small' | 'medium';
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
}

export interface ChipOption {
  value: string;
  label: string;
}
