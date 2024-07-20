import { AutoCompleteType } from '@/types';

export type CodeEditorProps = {
  autocomplete: AutoCompleteType;
  value?: string;
  onChange?: (value: string) => void;
};

export type CodeEditorSettingType = {
  database: string;
  schema: string;
};
