import type { ColumnType, EditedRow, FilterType, RowType, SortType } from '@/types';

export type RunQueryRequestType = {
  connectionId: number;
  nodeId: string;
  limit: number;
  offset: number;
  columns: string[];
  filters: FilterType[];
  sorts: SortType[];
};

export type RunRawQueryRequestType = {
  connectionId: number;
  query: string;
};

export type AutoCompleteRequestType = {
  connectionId: number;
  fromCache?: boolean;
  database?: string;
  schema?: string;
};

export type RunQueryResponseType = {
  query: string;
  data: any[];
  columns: ColumnType[];
};

export type UpdateQueryRequestType = {
  connectionId: number;
  nodeId: string;
  edited: EditedRow[];
  removed: RowType[];
  added: RowType[];
};

export type UpdateQueryResponseType = {
  query: string[];
  rowAffected: number;
};
