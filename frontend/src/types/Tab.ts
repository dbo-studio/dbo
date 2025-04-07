import type { TabMode } from '@/core/enums';
import type { RowType } from './Data';

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
  connectionId: string | number;
  nodeId: string;
  table?: string;
  query?: string;
  pagination?: TabDataPagination;
  showQuery?: boolean;
  showColumns?: boolean;
  showFilters?: boolean;
  showSorts?: boolean;
  sorts?: SortType[];
  filters?: FilterType[];
  columns?: string[];
  mode: TabMode;
  options?: Record<string, any>;
};

export type EditedRow = {
  dboIndex: number;
  conditions: object;
  old: RowType;
  new: RowType;
};

export type TabDataPagination = {
  page: number;
  limit: number;
};
