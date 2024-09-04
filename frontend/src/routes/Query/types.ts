import { CodeEditorSettingType } from '@/components/base/CodeEditor/types';
import { AutoCompleteType } from '@/types';

export type QueryEditorLeadingProps = {
  onChange: (data: CodeEditorSettingType) => void;
};

export type QueryEditorActionsProps = {
  onFormat: () => void;
};

export type QueryEditorActionBarProps = QueryEditorLeadingProps & QueryEditorActionsProps;

export type QueryEditorProps = {
  autocomplete: AutoCompleteType;
};
