import type { ColumnType } from '@/types';

export type EditableType = {
  [key: string]: Editable;
};

export type ColumnItemProps = {
  column: ColumnType;
  edited: boolean;
  deleted: boolean;
  unsaved: boolean;
  onChange: (oldValue: ColumnType, newValue: ColumnType) => void;
  onSelect: () => void;
  onEditToggle: (column: ColumnType) => void;
};

export type Editable = {
  name: boolean;
  default: boolean;
  length: boolean;
  comment: boolean;
};

export type ColumnItemStyledProps = {
  selected: boolean | number;
  edited: boolean | number;
  deleted: boolean | number;
  unsaved: boolean | number;
};
