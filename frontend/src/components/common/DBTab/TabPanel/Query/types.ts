import { CodeEditorSettingType } from '@/components/base/CodeEditorV2/types';

export type QueryEditorLeadingProps = {
  onChange: (data: CodeEditorSettingType) => void;
};

export interface QueryEditorActionBarProps extends QueryEditorLeadingProps {}

export type QueryEditorProps = {
  setting: CodeEditorSettingType;
};
