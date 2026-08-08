export type DateTimePickerMode = 'date' | 'time' | 'datetime';

export type DateTimePickerVariant = 'cell' | 'field';

export type DateTimePickerProps = {
  mode: DateTimePickerMode;
  value: unknown;
  onCommit: (next: string) => void;
  /** Grid cell editing: exit edit mode after commit/cancel. Optional for form fields. */
  onCancelEdit?: () => void;
  variant?: DateTimePickerVariant;
  label?: string;
  typelabel?: string;
  size?: 'small' | 'medium';
  disabled?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  'data-testid'?: string;
};
