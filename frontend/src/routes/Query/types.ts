import type { AutoCompleteType } from '@/types';

export type QueryEditorLeadingProps = {
  databases: string[];
  schemas: string[];
};

export type QueryEditorActionsProps = {
  onFormat: () => void;
};

export type QueryEditorActionBarProps = {
  databases: string[];
  schemas: string[];
  onFormat: () => void;
};

export type QueryEditorProps = {
  autocomplete: AutoCompleteType;
};
