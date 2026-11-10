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
  /** Replaces the SQL formatter and hides minify and export (for non-SQL editors). */
  formatQuery?: () => void;
  /** Replaces the SQL export dialog; receives the clicked button as the menu anchor. */
  onExport?: (anchor: HTMLElement) => void;
  /** Replaces the data-store cancel when the editor runs its own requests. */
  onStop?: () => void;
};

export type QueryEditorActionBarProps = {
  databases: string[];
  schemas: string[];
  onFormat: () => void;
  onRunQuery: (query?: string) => void;
  onAiExplain: () => void;
  loading: boolean;
  /** Replaces the SQL formatter and hides minify and export (for non-SQL editors). */
  formatQuery?: () => void;
  onExport?: (anchor: HTMLElement) => void;
  onStop?: () => void;
};

export type QueryEditorProps = {
  autocomplete: AutoCompleteType;
};

export type QueryResultGridProps = {
  loading: boolean;
  rows: RowType[];
  columns: ColumnType[];
};
