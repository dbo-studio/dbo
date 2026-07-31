import { OnChangeValue, type FormatOptionLabelMeta, type MenuPlacement } from 'react-select';
import type { ReactNode } from 'react';

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
  style?: React.CSSProperties;
  formatOptionLabel?: (option: SelectInputOption, meta: FormatOptionLabelMeta<SelectInputOption>) => ReactNode;
  onMenuOpen?: () => void;
  menuPlacement?: MenuPlacement;
};

export type SelectInputOption = {
  [x: string]: unknown;
  value: unknown;
  label: string;
};
