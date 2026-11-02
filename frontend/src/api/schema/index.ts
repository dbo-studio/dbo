import type { DiagramGraph } from '@/core/diagram/types';
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
