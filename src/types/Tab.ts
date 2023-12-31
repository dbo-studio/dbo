export type SortType = {
  index: string;
  column: string;
  operator: string;
  value: string | number;
  isActive: boolean;
};

export type FilterType = {
  index: string;
  column: string;
  operator: string;
  value: string | number;
  isActive: boolean;
};

export type TabType = {
  id: string;
  table: string;
  query: string;
  rows: any[];
  columns: any[];
  showQuery: boolean;
  showColumns: boolean;
  showFilters: boolean;
  showSorts: boolean;
  sorts: SortType[];
  filters: FilterType[];
};
