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
  confirmed?: boolean;
  /** Seconds to wait before the query moves to the background (0: never). The server's default is 10. */
  backgroundAfterSeconds?: number;
};

export type RunRawQueryRequestType = {
  connectionId: number;
  query: string;
  database?: string;
  schema?: string;
  confirmed?: boolean;
  limit?: number;
  page?: number;
  backgroundAfterSeconds?: number;
  /** The tab whose open transaction the query runs in. */
  transactionTab?: string;
};

export type TransactionRequestType = {
  connectionId: number;
  tab: string;
  database?: string;
};

/** The answer to a query that outlasted its wait: it keeps running as this job. */
export type BackgroundQueryType = { status: 'background'; jobId: number };

export const isBackgroundQuery = (answer: RunQueryResponseType | BackgroundQueryType): answer is BackgroundQueryType =>
  'status' in answer && answer.status === 'background';

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
  paginated?: boolean;
  limit?: number;
  page?: number;
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
