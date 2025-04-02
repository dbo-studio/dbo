import type { SqlEditorSettingType } from '@/components/base/SqlEditor/types';
import type { AutoCompleteType } from '@/types';

export type QueryEditorLeadingProps = {
  databases: string[];
  schemas: string[];

  onChange: (data: SqlEditorSettingType) => void;
};

export type QueryEditorActionsProps = {
  onFormat: () => void;
};

export type QueryEditorActionBarProps = {
  databases: string[];
  schemas: string[];

  onChange: (data: SqlEditorSettingType) => void;
  onFormat: () => void;
};

export type QueryEditorProps = {
  autocomplete: AutoCompleteType;
};
