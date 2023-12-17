export type FilterConditions = '=' | '!=' | '<' | '>';

export type Sort = {
  column: string;
  condition: FilterConditions;
  value: string | number;
};

export type Filter = {
  column: string;
  condition: FilterConditions;
  value: string | number;
};

export type Tab = {
  id: string;
  table: string;
  query: string;
  rows: any[];
  columns: any[];
  showQuery: boolean;
  showColumns: boolean;
  showFilters: boolean;
  showSorts: boolean;
  sorts: Sort[];
  filters: Filter[];
};
