import { api } from '@/core/api';

export type McpStatus = {
  enabled: boolean;
  running: boolean;
  port: number;
  proxyUrl: string;
  tokenMasked?: string;
  defaultConnectionId?: number;
  healthy: boolean;
};

export type McpUpdateResponse = McpStatus & { token?: string };

export const getStatus = async (): Promise<McpStatus> => {
  return (await api.get<{ data: McpStatus }>('/mcp/status')).data.data;
};

export const update = async (body: {
  enabled: boolean;
  port?: number;
  defaultConnectionId?: number;
}): Promise<McpUpdateResponse> => {
  return (await api.post<{ data: McpUpdateResponse }>('/mcp/update', body)).data.data;
};

export const regenerateToken = async (): Promise<{ token: string }> => {
  return (await api.post<{ data: { token: string } }>('/mcp/regenerate-token', {})).data.data;
};
