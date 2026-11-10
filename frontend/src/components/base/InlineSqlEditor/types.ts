import type { ColumnType } from '@/types';

export type ConditionSqlEditorProps = {
  /** SQL column names for completion; omit for languages that complete from their own context. */
  columns?: ColumnType[];
  language?: 'sql' | 'json' | 'plaintext';
  placeholder: string;
  value: string;
  onChange?: (value: string) => void;
  onBlur?: (value: string) => void;
  onEnter?: (value: string) => void;
};
