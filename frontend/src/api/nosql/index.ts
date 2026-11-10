import type {
  NoSQLBulkDeletePreview,
  NoSQLCommandRequest,
  NoSQLBrowsePage,
  NoSQLBrowseRequest,
  NoSQLContainerSpec,
  NoSQLDeleteRequest,
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
