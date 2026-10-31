import { api } from '@/core/api';
import type {
  CreateShareRequestType,
  DashboardShareListType,
  DashboardShareType,
  DashboardType,
  PublicDashboardType,
  UpdateShareRequestType
} from './types';

export const getDashboards = async (connectionId: number): Promise<DashboardType[]> =>
  (await api.get<{ data: DashboardType[] }>('/dashboards', { params: { connectionId } })).data.data;

export const createDashboard = async (connectionId: number, name: string): Promise<DashboardType> =>
  (await api.post<{ data: DashboardType }>('/dashboards', { connectionId, name })).data.data;

export const renameDashboard = async (id: number, name: string): Promise<DashboardType> =>
  (await api.patch<{ data: DashboardType }>(`/dashboards/${id}`, { name })).data.data;

export const duplicateDashboard = async (id: number): Promise<DashboardType> =>
  (await api.post<{ data: DashboardType }>(`/dashboards/${id}/duplicate`)).data.data;

export const deleteDashboard = async (id: number): Promise<void> => {
  await api.delete(`/dashboards/${id}`);
};

export const pinToDashboard = async (id: number, questionId: number): Promise<DashboardType> =>
  (await api.post<{ data: DashboardType }>(`/dashboards/${id}/cards`, { questionId })).data.data;

export const resizeCard = async (id: number, cardId: number, width: 1 | 2): Promise<DashboardType> =>
  (await api.patch<{ data: DashboardType }>(`/dashboards/${id}/cards/${cardId}`, { width })).data.data;

export const unpinCard = async (id: number, cardId: number): Promise<DashboardType> =>
  (await api.delete<{ data: DashboardType }>(`/dashboards/${id}/cards/${cardId}`)).data.data;

/** Saves the card order; `cardIds` must list every card of the board. */
export const reorderCards = async (id: number, cardIds: number[]): Promise<DashboardType> =>
  (await api.put<{ data: DashboardType }>(`/dashboards/${id}/cards/order`, { cardIds })).data.data;

export const getShares = async (id: number): Promise<DashboardShareListType> =>
  (await api.get<{ data: DashboardShareListType }>(`/dashboards/${id}/shares`)).data.data;

export const createShare = async (id: number, data: CreateShareRequestType): Promise<DashboardShareType> =>
  (await api.post<{ data: DashboardShareType }>(`/dashboards/${id}/shares`, data)).data.data;

export const updateShare = async (id: number, shareId: number, data: UpdateShareRequestType): Promise<DashboardShareType> =>
  (await api.patch<{ data: DashboardShareType }>(`/dashboards/${id}/shares/${shareId}`, data)).data.data;

export const revokeShare = async (id: number, shareId: number): Promise<DashboardShareType> =>
  (await api.delete<{ data: DashboardShareType }>(`/dashboards/${id}/shares/${shareId}`)).data.data;

/** The page behind a share link. A wrong or missing password answers 401 `share_password_required` / `share_password_invalid`. */
export const viewSharedDashboard = async (token: string, password?: string): Promise<PublicDashboardType> =>
  (await api.post<{ data: PublicDashboardType }>(`/public/dashboards/${encodeURIComponent(token)}`, { password })).data.data;
