import { ColumnType, FilterType, SortType } from '@/src/types';

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
