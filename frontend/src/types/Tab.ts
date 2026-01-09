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

export type TabType = DataTabType | EditorTabType | ObjectTabType;

type BaseTab = {
  id: string;
  connectionId: string | number;
  nodeId: string;
  action?: string;
  mode: TabMode;
};

export type DataTabType = BaseTab & {
  name: string;
  table?: string;
  pagination?: TabDataPagination;
  showQuery?: boolean;
  showColumns?: boolean;
  showFilters?: boolean;
  showSorts?: boolean;
  sorts?: SortType[];
  filters?: FilterType[];
  columns?: string[];
  editable: boolean;
};

export type EditorTabType = BaseTab & {
  name: string;
  database: '';
  schema: '';
};

export type ObjectTabType = BaseTab & {
  name: string;
  objectTabId: string | null;
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
