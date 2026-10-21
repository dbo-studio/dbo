import { api } from '@/core/api';
import type { DashboardType } from './types';

export const getDashboards = async (connectionId: number): Promise<DashboardType[]> =>
  (await api.get<{ data: DashboardType[] }>('/dashboards', { params: { connectionId } })).data.data;

export const createDashboard = async (connectionId: number, name: string): Promise<DashboardType> =>
  (await api.post<{ data: DashboardType }>('/dashboards', { connectionId, name })).data.data;

export const deleteDashboard = async (id: number): Promise<void> => {
  await api.delete(`/dashboards/${id}`);
};

export const pinToDashboard = async (id: number, questionId: number): Promise<DashboardType> =>
  (await api.post<{ data: DashboardType }>(`/dashboards/${id}/cards`, { questionId })).data.data;

export const resizeCard = async (id: number, cardId: number, width: 1 | 2): Promise<DashboardType> =>
  (await api.patch<{ data: DashboardType }>(`/dashboards/${id}/cards/${cardId}`, { width })).data.data;

export const unpinCard = async (id: number, cardId: number): Promise<DashboardType> =>
  (await api.delete<{ data: DashboardType }>(`/dashboards/${id}/cards/${cardId}`)).data.data;
