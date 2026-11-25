import { api } from '@/core/api';

export type ActivityAction = 'cancel-query' | 'end-session' | 'disconnect-client';
export type ServerPanelName = 'status' | 'operations' | 'databases' | 'users';
export type ServerPanel = { columns: string[]; rows: unknown[][] };

export async function capabilities(connectionId: number) {
  const response = await api.get<{ data: { panels: ServerPanelName[]; activityAction?: ActivityAction } }>(
    '/server/capabilities',
    { params: { connectionId }, silent: true }
  );
  return response.data.data;
}

export async function panel(connectionId: number, name: ServerPanelName): Promise<ServerPanel> {
  const response = await api.get<{ data: ServerPanel }>(`/server/panels/${name}`, {
    params: { connectionId },
    silent: true
  });
  return response.data.data;
}

export async function endActivity(connectionId: number, target: string, token: string) {
  await api.post('/server/activity/end', { connectionId, target, token, confirmed: true }, { silent: true });
}
