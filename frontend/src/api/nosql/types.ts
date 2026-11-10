export type NoSQLViewKind = 'text' | 'document' | 'fields' | 'list' | 'set' | 'table';
export type NoSQLFilterKind = 'pattern' | 'fields' | 'query';
export type NoSQLListStyle = 'flat' | 'tree';
export type NoSQLCapability =
  | 'insert'
  | 'edit'
  | 'delete'
  | 'bulk-delete'
  | 'bulk-delete-pattern'
  | 'ttl'
  | 'rename'
  | 'recycle'
  | 'window'
  | 'stats';

export type NoSQLFieldInfo = { name: string; types: string[] };

export type NoSQLCreateKind = { id: string; label: string; view: NoSQLViewKind };

export type NoSQLContainerSpec = {
  filter: NoSQLFilterKind;
  fields: NoSQLFieldInfo[] | null;
  listStyle: NoSQLListStyle;
  delimiter: string;
  capabilities: NoSQLCapability[] | null;
  tools: string[] | null;
  createKinds: NoSQLCreateKind[] | null;
};

/** Non-UTF-8 values arrive base64 with `meta.encoding === 'base64'`. */
export type NoSQLItem = {
  id: string;
  view: NoSQLViewKind;
  value: unknown;
  meta: Record<string, unknown> | null;
};

export type NoSQLBrowseFilter = { field: string; operator: string; value: string; next: string };
export type NoSQLBrowseSort = { field: string; desc: boolean };

export type NoSQLBrowseRequest = {
  connectionId: number;
  containerId: string;
  cursor?: string;
  limit?: number;
  filter?: string;
  filters?: NoSQLBrowseFilter[];
  sorts?: NoSQLBrowseSort[];
};

export type NoSQLBrowsePage = { items: NoSQLItem[]; nextCursor: string };

export type NoSQLItemRef = { connectionId: number; containerId: string; itemId: string };

export type NoSQLSaveRequest = NoSQLItemRef & {
  change: { value?: unknown; meta?: Record<string, unknown>; newId?: string; ttlSecs?: number };
  confirmed?: boolean;
};

export type NoSQLInsertRequest = {
  connectionId: number;
  containerId: string;
  item: { id: string; view: NoSQLViewKind; value: unknown; meta?: Record<string, unknown> };
  confirmed?: boolean;
};

export type NoSQLDeleteRequest = {
  connectionId: number;
  containerId: string;
  itemIds: string[];
  confirmed?: boolean;
};

export type NoSQLStreamMessage = {
  type: 'message' | 'ping' | 'error';
  channel?: string;
  payload?: string;
  message?: string;
};

export type NoSQLCommandRequest = { connectionId: number; input: string; confirmed?: boolean };

export type NoSQLBulkDeletePreview = { count: number; capped: boolean };

export type NoSQLMember = { key: string; value: string; score?: number };
export type NoSQLMemberWindow = { members: NoSQLMember[]; nextCursor: string; total: number };
export type NoSQLMemberOp = { op: 'set' | 'remove' | 'append'; key: string; value: string; score?: number };

export type NoSQLRecycleItem = { id: number; containerId: string; itemId: string; size: number; deletedAt: string };

export type NoSQLIndexInfo = { name: string; keys: string; unique: boolean };
export type NoSQLContainerStats = {
  count: number;
  size: number;
  avgObjSize: number;
  storageSize: number;
  indexes: NoSQLIndexInfo[];
};
