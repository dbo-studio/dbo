import { ColumnType, EditedRow, FilterType, RowType, SortType } from '@/types';

export type RunQueryType = {
  connection_id: number;
  table: string;
  schema: string;
  limit: number;
  offset: number;
  columns: string[];
  filters: FilterType[];
  sorts: SortType[];
};

export type RunRawQueryType = {
  connection_id: number;
  query: string;
};

export type AutoCompleteRequestType = {
  connection_id: number;
  database?: string;
  from_cache?: boolean;
  schema?: string;
};

export type RunQueryResponseType = {
  query: string;
  data: any[];
  structures: ColumnType[];
};

export type UpdateQueryType = {
  connection_id: number;
  schema: string;
  database: string;
  table: string;
  edited: EditedRow[];
  removed: RowType[];
  added: RowType[];
};
