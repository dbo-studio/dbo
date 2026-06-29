import type { AutoCompleteType } from '@/types';

import type { AiSelectionAction } from '@/types';

export type SqlEditorProps = {
  autocomplete: AutoCompleteType;
  value: string;
  placeholder?: string;
  editorHeight?: string | number;
  onChange?: (value: string) => void;
  onBlur?: (value: string) => void;
  onMount?: () => void;
  onRunQuery: (query?: string) => void;
  onAiSelection?: (sql: string, action: AiSelectionAction) => void;
  hasQueryError?: boolean;
};

export type SqlEditorSettingType = {
  database: string;
  schema: string;
};

export interface SqlEditorRef {
  getSelectedQuery: () => string | undefined;
}
