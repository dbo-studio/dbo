import type {
  NoSQLBulkDeletePreview,
  NoSQLCommandRequest,
  NoSQLBrowsePage,
  NoSQLBrowseRequest,
  NoSQLContainerSpec,
  NoSQLDeleteRequest,
  NoSQLDocChildren,
  NoSQLDocFieldRequest,
  NoSQLAggregateResult,
  NoSQLChangeMessage,
  NoSQLCollectionInfo,
  NoSQLCollectionOptions,
  NoSQLDatabase,
  NoSQLGridFile,
  NoSQLOperation,
  NoSQLServerStatus,
  NoSQLUser,
  NoSQLExplain,
  NoSQLSchemaAnalysis,
  NoSQLValidator,
  NoSQLIndexDetail,
  NoSQLIndexSpec,
  NoSQLInsertRequest,
  NoSQLItem,
  NoSQLContainerStats,
  NoSQLItemRef,
  NoSQLMemberOp,
  NoSQLMemberWindow,
  NoSQLRecycleItem,
  NoSQLSaveRequest,
  NoSQLStreamMessage
} from '@/api/nosql/types';
import { api } from '@/core/api';

const baseURL = (): string => import.meta.env.VITE_PUBLIC_SERVER_URL ?? '/api';

export const describe = async (connectionId: number, containerId: string): Promise<NoSQLContainerSpec> =>
  (await api.get<{ data: NoSQLContainerSpec }>('/nosql/describe', { params: { connectionId, containerId } })).data.data;

export const browse = async ({ filters, sorts, ...params }: NoSQLBrowseRequest): Promise<NoSQLBrowsePage> =>
  (
    await api.get<{ data: NoSQLBrowsePage }>('/nosql/browse', {
      params: {
        ...params,
        filters: filters?.length ? JSON.stringify(filters) : undefined,
        sorts: sorts?.length ? JSON.stringify(sorts) : undefined
      }
    })
  ).data.data;

export const getItem = async (params: NoSQLItemRef): Promise<NoSQLItem> =>
  (await api.get<{ data: NoSQLItem }>('/nosql/item', { params })).data.data;

export const docChildren = async (
  params: NoSQLItemRef & { path: string[]; offset?: number; limit?: number }
): Promise<NoSQLDocChildren> =>
  (
    await api.get<{ data: NoSQLDocChildren }>('/nosql/item/tree', {
      params: { ...params, path: JSON.stringify(params.path) }
    })
  ).data.data;

export const docSetField = async (req: NoSQLDocFieldRequest): Promise<void> => {
  await api.put('/nosql/item/field', req);
};

export const docUnsetField = async (req: NoSQLDocFieldRequest): Promise<void> => {
  await api.post('/nosql/item/field/unset', req);
};

export const indexes = async (connectionId: number, containerId: string): Promise<NoSQLIndexDetail[]> =>
  (await api.get<{ data: NoSQLIndexDetail[] }>('/nosql/indexes', { params: { connectionId, containerId } })).data.data;

export const createIndex = async (
  connectionId: number,
  containerId: string,
  spec: NoSQLIndexSpec,
  confirmed?: boolean
): Promise<void> => {
  await api.post('/nosql/indexes', { connectionId, containerId, spec, confirmed });
};

export const dropIndex = async (
  connectionId: number,
  containerId: string,
  name: string,
  confirmed?: boolean
): Promise<void> => {
  await api.post('/nosql/indexes/drop', { connectionId, containerId, name, confirmed });
};

export const explain = async (
  params: Pick<NoSQLBrowseRequest, 'connectionId' | 'containerId' | 'filter' | 'sorts'>
): Promise<NoSQLExplain> =>
  (
    await api.get<{ data: NoSQLExplain }>('/nosql/explain', {
      params: { ...params, sorts: params.sorts?.length ? JSON.stringify(params.sorts) : undefined }
    })
  ).data.data;

export const aggregate = async (
  connectionId: number,
  containerId: string,
  pipeline: string,
  limit = 50
): Promise<NoSQLAggregateResult> =>
  (
    await api.post<{ data: NoSQLAggregateResult }>('/nosql/aggregate', {
      connectionId,
      containerId,
      pipeline,
      limit
    })
  ).data.data;

export const schema = async (connectionId: number, containerId: string, sample = 1000): Promise<NoSQLSchemaAnalysis> =>
  (
    await api.get<{ data: NoSQLSchemaAnalysis }>('/nosql/schema', {
      params: { connectionId, containerId, sample }
    })
  ).data.data;

export const getValidator = async (connectionId: number, containerId: string): Promise<NoSQLValidator> =>
  (await api.get<{ data: NoSQLValidator }>('/nosql/validator', { params: { connectionId, containerId } })).data.data;

export const setValidator = async (
  connectionId: number,
  containerId: string,
  validator: NoSQLValidator,
  confirmed?: boolean
): Promise<void> => {
  await api.put('/nosql/validator', { connectionId, containerId, validator, confirmed });
};

export const exportCollection = async (
  connectionId: number,
  containerId: string,
  filter?: string,
  format: 'ndjson' | 'csv' = 'ndjson'
): Promise<Blob> =>
  (
    await api.get<Blob>('/nosql/export', {
      params: { connectionId, containerId, filter, format },
      responseType: 'blob'
    })
  ).data;

/** Uploads a file for a background import and returns the job that runs it. */
export const importFile = async (
  connectionId: number,
  containerId: string,
  file: File,
  format: 'ndjson' | 'json' | 'csv',
  confirmed?: boolean
): Promise<number> => {
  const form = new FormData();
  form.append('connectionId', String(connectionId));
  form.append('containerId', containerId);
  form.append('format', format);
  form.append('confirmed', String(!!confirmed));
  form.append('file', file);

  return (
    await api.post<{ data: { jobId: number } }>('/nosql/import/job', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  ).data.data.jobId;
};

export const importData = async (
  connectionId: number,
  containerId: string,
  data: string,
  format: 'ndjson' | 'json',
  confirmed?: boolean
): Promise<number> =>
  (
    await api.post<{ data: { inserted: number } }>('/nosql/import', {
      connectionId,
      containerId,
      data,
      format,
      confirmed
    })
  ).data.data.inserted;

export const renameCollection = async (
  connectionId: number,
  containerId: string,
  newName: string,
  confirmed?: boolean
): Promise<string> =>
  (
    await api.post<{ data: { containerId: string } }>('/nosql/collection/rename', {
      connectionId,
      containerId,
      newName,
      confirmed
    })
  ).data.data.containerId;

export const dropCollection = async (connectionId: number, containerId: string, confirmed?: boolean): Promise<void> => {
  await api.post('/nosql/collection/drop', { connectionId, containerId, confirmed });
};

export const saveItem = async (req: NoSQLSaveRequest): Promise<void> => {
  await api.put('/nosql/item', req);
};

export const insertItem = async (req: NoSQLInsertRequest): Promise<string> =>
  (await api.post<{ data: { id: string } }>('/nosql/item', req)).data.data.id;

export const deleteItems = async (req: NoSQLDeleteRequest): Promise<void> => {
  await api.post('/nosql/items/delete', req);
};

export const bulkDeletePreview = async (
  connectionId: number,
  containerId: string,
  pattern: string
): Promise<NoSQLBulkDeletePreview> =>
  (
    await api.get<{ data: NoSQLBulkDeletePreview }>('/nosql/bulk-delete/preview', {
      params: { connectionId, containerId, pattern }
    })
  ).data.data;

/** Starts the background job and returns its id. */
export const bulkDelete = async (req: {
  connectionId: number;
  containerId: string;
  pattern: string;
  confirmName: string;
}): Promise<number> => (await api.post<{ data: { jobId: number } }>('/nosql/bulk-delete', req)).data.data.jobId;

export const runCommand = async (req: NoSQLCommandRequest): Promise<unknown> =>
  (await api.post<{ data: { output: unknown } }>('/nosql/tools/cli/run', req)).data.data.output;

export const pubsubChannels = async (connectionId: number, pattern = ''): Promise<string[]> =>
  (await api.get<{ data: string[] }>('/nosql/tools/pubsub/channels', { params: { connectionId, pattern } })).data.data;

export const pubsubPublish = async (
  connectionId: number,
  channel: string,
  message: string,
  confirmed?: boolean
): Promise<void> => {
  await api.post('/nosql/tools/pubsub/publish', { connectionId, channel, message, confirmed });
};

/**
 * Streams NDJSON messages until `signal` aborts. Aborting closes the request, which the
 * server detects (failed write) and uses to cancel the subscription.
 */
export const pubsubStream = async (
  connectionId: number,
  channels: string[],
  signal: AbortSignal,
  onMessage: (msg: NoSQLStreamMessage) => void
): Promise<void> => {
  const qs = new URLSearchParams({ connectionId: String(connectionId) });
  channels.forEach((c) => qs.append('channel', c));

  const res = await fetch(`${baseURL()}/nosql/tools/pubsub/stream?${qs.toString()}`, {
    credentials: 'include',
    headers: { 'X-Client-Mode': 'web' },
    signal
  });
  if (!res.ok || !res.body) {
    throw new Error(`stream failed: ${res.status}`);
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      return;
    }

    buffer += value;
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    lines.filter(Boolean).forEach((line) => onMessage(JSON.parse(line) as NoSQLStreamMessage));
  }
};

export const memberWindow = async (
  params: NoSQLItemRef & { cursor?: string; limit?: number }
): Promise<NoSQLMemberWindow> =>
  (await api.get<{ data: NoSQLMemberWindow }>('/nosql/item/window', { params })).data.data;

export const applyMember = async (req: NoSQLItemRef & { op: NoSQLMemberOp; confirmed?: boolean }): Promise<void> => {
  await api.post('/nosql/item/member', req);
};

export const recycleList = async (connectionId: number): Promise<NoSQLRecycleItem[]> =>
  (await api.get<{ data: NoSQLRecycleItem[] }>('/nosql/recycle', { params: { connectionId } })).data.data;

export const recycleRestore = async (connectionId: number, id: number, confirmed?: boolean): Promise<void> => {
  await api.post(`/nosql/recycle/${id}/restore`, { confirmed }, { params: { connectionId } });
};

export const containerStats = async (connectionId: number, containerId: string): Promise<NoSQLContainerStats> =>
  (await api.get<{ data: NoSQLContainerStats }>('/nosql/stats', { params: { connectionId, containerId } })).data.data;

// ---- server tools (MongoDB) ----

const server = <T>(path: string, connectionId: number, params: Record<string, string | number> = {}): Promise<T> =>
  api.get<{ data: T }>(`/nosql/server/${path}`, { params: { connectionId, ...params } }).then((r) => r.data.data);

const serverWrite = async (
  path: string,
  connectionId: number,
  body: Record<string, unknown>,
  confirmed?: boolean
): Promise<void> => {
  await api.post(`/nosql/server/${path}`, { connectionId, confirmed, ...body });
};

export const serverStatus = (connectionId: number): Promise<NoSQLServerStatus> => server('status', connectionId);
export const serverOperations = (connectionId: number): Promise<NoSQLOperation[]> => server('operations', connectionId);
export const serverKill = (connectionId: number, id: string, confirmed?: boolean): Promise<void> =>
  serverWrite('operations/kill', connectionId, { id }, confirmed);
export const serverDatabases = (connectionId: number): Promise<NoSQLDatabase[]> => server('databases', connectionId);
export const serverCreateDatabase = (
  connectionId: number,
  name: string,
  collection: string,
  confirmed?: boolean
): Promise<void> => serverWrite('databases', connectionId, { name, collection }, confirmed);
export const serverDropDatabase = (connectionId: number, name: string, confirmed?: boolean): Promise<void> =>
  serverWrite('databases/drop', connectionId, { name }, confirmed);
export const serverCollections = (connectionId: number, database: string): Promise<NoSQLCollectionInfo[]> =>
  server('collections', connectionId, { database });
export const serverCreateCollection = (
  connectionId: number,
  database: string,
  name: string,
  options: NoSQLCollectionOptions,
  confirmed?: boolean
): Promise<void> => serverWrite('collections', connectionId, { database, name, options }, confirmed);
export const serverUsers = (connectionId: number): Promise<NoSQLUser[]> => server('users', connectionId);
export const gridfsBuckets = (connectionId: number, database: string): Promise<string[]> =>
  server('gridfs/buckets', connectionId, { database });
export const gridfsFiles = (connectionId: number, database: string, bucket: string): Promise<NoSQLGridFile[]> =>
  server('gridfs/files', connectionId, { database, bucket });
export const gridfsDownload = async (
  connectionId: number,
  database: string,
  bucket: string,
  id: string
): Promise<Blob> =>
  (
    await api.get<Blob>('/nosql/server/gridfs/download', {
      params: { connectionId, database, bucket, id },
      responseType: 'blob'
    })
  ).data;
export const gridfsDelete = (
  connectionId: number,
  database: string,
  bucket: string,
  id: string,
  confirmed?: boolean
): Promise<void> => serverWrite('gridfs/delete', connectionId, { database, bucket, id }, confirmed);

/** Streams change events of one collection until `signal` aborts. */
export const changeStream = async (
  connectionId: number,
  containerId: string,
  signal: AbortSignal,
  onMessage: (msg: NoSQLChangeMessage) => void
): Promise<void> => {
  const qs = new URLSearchParams({ connectionId: String(connectionId), containerId });
  const res = await fetch(`${baseURL()}/nosql/server/changes?${qs.toString()}`, {
    credentials: 'include',
    headers: { 'X-Client-Mode': 'web' },
    signal
  });
  if (!res.ok || !res.body) {
    throw new Error(`stream failed: ${res.status}`);
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;

    buffer += value;
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    lines.filter(Boolean).forEach((line) => onMessage(JSON.parse(line) as NoSQLChangeMessage));
  }
};
