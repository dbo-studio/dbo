import { api } from '@/core/api';
import type {
  CreateShareRequestType,
  DashboardShareListType,
  DashboardShareType,
  DashboardType,
  PublicDashboardType,
  ShareVisitType,
  SmtpRequestType,
  SmtpSettingsType,
  SubscriptionListType,
  SubscriptionRequestType,
  SubscriptionRunType,
  SubscriptionType,
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

export const getShareVisits = async (id: number, shareId: number): Promise<ShareVisitType[]> =>
  (await api.get<{ data: ShareVisitType[] }>(`/dashboards/${id}/shares/${shareId}/visits`)).data.data;

export const revokeShare = async (id: number, shareId: number): Promise<DashboardShareType> =>
  (await api.delete<{ data: DashboardShareType }>(`/dashboards/${id}/shares/${shareId}`)).data.data;

/** The page behind a share link. A wrong or missing password answers 401 `share_password_required` / `share_password_invalid`. */
export const viewSharedDashboard = async (
  token: string,
  password?: string,
  params?: Record<string, string>
): Promise<PublicDashboardType> =>
  (await api.post<{ data: PublicDashboardType }>(`/public/dashboards/${encodeURIComponent(token)}`, { password, params })).data.data;

export const getSubscriptions = async (id: number): Promise<SubscriptionListType> =>
  (await api.get<{ data: SubscriptionListType }>(`/dashboards/${id}/subscriptions`)).data.data;

export const createSubscription = async (id: number, data: SubscriptionRequestType): Promise<SubscriptionType> =>
  (await api.post<{ data: SubscriptionType }>(`/dashboards/${id}/subscriptions`, data)).data.data;

export const updateSubscription = async (id: number, subId: number, data: SubscriptionRequestType): Promise<SubscriptionType> =>
  (await api.patch<{ data: SubscriptionType }>(`/dashboards/${id}/subscriptions/${subId}`, data)).data.data;

export const deleteSubscription = async (id: number, subId: number): Promise<void> => {
  await api.delete(`/dashboards/${id}/subscriptions/${subId}`);
};

/** Sends one snapshot now, without moving the schedule. A failed delivery is a run with status `failed`, not an error. */
export const runSubscription = async (id: number, subId: number): Promise<SubscriptionRunType> =>
  (await api.post<{ data: SubscriptionRunType }>(`/dashboards/${id}/subscriptions/${subId}/run`)).data.data;

export const getSubscriptionRuns = async (id: number, subId: number): Promise<SubscriptionRunType[]> =>
  (await api.get<{ data: SubscriptionRunType[] }>(`/dashboards/${id}/subscriptions/${subId}/runs`)).data.data;

export const getSmtpSettings = async (): Promise<SmtpSettingsType> =>
  (await api.get<{ data: SmtpSettingsType }>('/subscriptions/smtp')).data.data;

export const saveSmtpSettings = async (data: SmtpRequestType): Promise<SmtpSettingsType> =>
  (await api.put<{ data: SmtpSettingsType }>('/subscriptions/smtp', data)).data.data;
