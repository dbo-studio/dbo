import type { DiagramGraph } from '@/core/diagram/types';
import type { SchemaChangeOp } from '@/types';
import { api } from '@/core/api';

export type DiagramRequestType = {
  connectionId: string | number;
  database?: string;
  schema?: string;
  tables?: string[];
};

export const getDiagram = async (params: DiagramRequestType, signal?: AbortSignal): Promise<DiagramGraph> => {
  return (
    await api.get<{ data: DiagramGraph }>('/schema/diagram', {
      params: {
        connectionId: params.connectionId,
        database: params.database || undefined,
        schema: params.schema || undefined,
        tables: params.tables?.length ? params.tables.join(',') : undefined
      },
      signal
    })
  ).data.data;
};

export type SchemaChangeRequestType = {
  connectionId: number;
  database?: string;
  schema?: string;
  ops: SchemaChangeOp[];
  confirmed?: boolean;
};

export const previewChange = async (data: SchemaChangeRequestType): Promise<string[]> => {
  return (await api.post<{ data: { queries: string[] } }>('/schema/changes/preview', data)).data.data.queries;
};

/** Applies DDL under Safe Mode — call through withSafeModeRetry. */
export const applyChange = async (data: SchemaChangeRequestType): Promise<true> => {
  await api.post('/schema/changes/apply', data);
  return true;
};
