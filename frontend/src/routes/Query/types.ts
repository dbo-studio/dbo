import type { AutoCompleteType, ColumnType, RowType } from '@/types';

export type QueryEditorLeadingProps = {
  databases: string[];
  schemas: string[];
};

export type QueryEditorActionsProps = {
  onFormat: () => void;
  onRunQuery: (query?: string) => void;
  onAiExplain: () => void;
  loading: boolean;
};

export type QueryEditorActionBarProps = {
  databases: string[];
  schemas: string[];
  onFormat: () => void;
  onRunQuery: (query?: string) => void;
  onAiExplain: () => void;
  loading: boolean;
};

export type QueryEditorProps = {
  autocomplete: AutoCompleteType;
};

export type QueryResultGridProps = {
  loading: boolean;
  rows: RowType[];
  columns: ColumnType[];
};
