import { ColumnType, EditedRow, FilterType, RowType, SortType } from '@/src/types';

export type RunQueryType = {
  connection_id: number;
  table: string;
  schema: string;
  limit: number;
  offset: number;
  columns: ColumnType[];
  filters: FilterType[];
  sorts: SortType[];
};

export type RunRawQueryType = {
  connection_id: number;
  query: string;
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