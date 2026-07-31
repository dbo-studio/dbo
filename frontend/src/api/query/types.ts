import type { ColumnType, EditedRow, FilterType, RowType, SortType } from '@/types';

export type RunQueryRequestType = {
  connectionId: number;
  nodeId: string;
  limit: number;
  page: number;
  inlineQuery?: string;
  columns: string[];
  filters: FilterType[];
  sorts: SortType[];
};

export type RunRawQueryRequestType = {
  connectionId: number;
  query: string;
  database?: string;
  schema?: string;
  confirmed?: boolean;
};

export type GridMetaType = {
  gridEditable: boolean;
  updatableNodeId?: string;
  editableReason?: string;
  drivingTable?: string;
};

export type AutoCompleteRequestType = {
  connectionId: number;
  database?: string;
  schema?: string;
};

export type RunQueryResponseType = {
  query: string;
  data: RowType[];
  columns: ColumnType[];
  editable?: boolean;
  nodeId?: string;
  editableReason?: string;
  drivingTable?: string;
};

export type UpdateQueryRequestType = {
  connectionId: number;
  nodeId: string;
  edited: EditedRow[];
  removed: RowType[];
  added: RowType[];
  confirmed?: boolean;
};

export type UpdateQueryResponseType = {
  query: string[];
  rowAffected: number;
};
