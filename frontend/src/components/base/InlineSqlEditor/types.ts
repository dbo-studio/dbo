import type { ColumnType } from '@/types';

export type ConditionSqlEditorProps = {
  columns: ColumnType[];
  placeholder: string;
  value: string;
  onChange?: (value: string) => void;
  onBlur?: (value: string) => void;
  onEnter?: (value: string) => void;
};
