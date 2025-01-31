import type { SqlEditorSettingType } from '@/components/base/SqlEditor/types';
import type { AutoCompleteType } from '@/types';

export type QueryEditorLeadingProps = {
  onChange: (data: SqlEditorSettingType) => void;
};

export type QueryEditorActionsProps = {
  onFormat: () => void;
};

export type QueryEditorActionBarProps = QueryEditorLeadingProps & QueryEditorActionsProps;

export type QueryEditorProps = {
  autocomplete: AutoCompleteType;
};
