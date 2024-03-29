import { RowType } from './Data';

export type SortType = {
  index: string;
  column: string;
  operator: string;
  isActive: boolean;
};

export type FilterType = {
  index: string;
  column: string;
  operator: string;
  value: string | number;
  next: string;
  isActive: boolean;
};

export type TabType = {
  id: string;
  table: string;
  query: string;
  showQuery: boolean;
  showColumns: boolean;
  showFilters: boolean;
  showSorts: boolean;
  sorts: SortType[];
  filters: FilterType[];
  mode: TabMode;
};

export enum TabMode {
  Data = 0,
  Design = 1,
  Query = 2
}

export type EditedRow = {
  dboIndex: number;
  conditions: object;
  old: RowType;
  new: RowType;
};
