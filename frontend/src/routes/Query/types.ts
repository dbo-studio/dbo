import type { AutoCompleteType } from '@/types';

export type QueryEditorLeadingProps = {
  databases: string[];
  schemas: string[];
};

export type QueryEditorActionsProps = {
  onFormat: () => void;
  onRunQuery: (query?: string) => void;
  loading: boolean;
};

export type QueryEditorActionBarProps = {
  databases: string[];
  schemas: string[];
  onFormat: () => void;
  onRunQuery: (query?: string) => void;
  loading: boolean;
};

export type QueryEditorProps = {
  autocomplete: AutoCompleteType;
};
