import type { AutoCompleteType } from '@/types';

export type SqlEditorProps = {
  autocomplete: AutoCompleteType;
  value: string;
  onChange?: (value: string) => void;
  onBlur?: (value: string) => void;
  onMount?: () => void;
  onRunQuery: (query?: string) => void;
};

export type SqlEditorSettingType = {
  database: string;
  schema: string;
};
