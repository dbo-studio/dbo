import type { ColumnType, RowType } from '@/types';

export type MobileTableDataView = 'cards' | 'grid';

export type RowCardState = {
  isEdited: boolean;
  isUnsaved: boolean;
  isRemoved: boolean;
};

export type RowCardProps = {
  row: RowType;
  columns: ColumnType[];
  state: RowCardState;
  onClick: () => void;
};

export type RowCardStyledProps = {
  removed?: boolean;
};

export type RowCardBadgeTone = 'success' | 'warning' | 'danger';

export type RowCardBadgeStyledProps = {
  tone: RowCardBadgeTone;
};

export type RowEditSheetProps = {
  row: RowType;
  columns: ColumnType[];
  editable: boolean;
  onClose: () => void;
};

export type RowFieldProps = {
  column: ColumnType;
  value: string | null;
  editable: boolean;
  onChange: (value: string | null) => void;
};

export type RowFieldInputStyledProps = {
  muted?: boolean;
};
