import { api } from '@/core/api';
import type { NotificationListType } from './types';

export const list = async (limit = 30, offset = 0): Promise<NotificationListType> =>
  (await api.get<{ data: NotificationListType }>('/notifications', { params: { limit, offset } })).data.data;

export const markRead = async (id: number): Promise<void> => {
  await api.post(`/notifications/${id}/read`);
};

export const markAllRead = async (): Promise<void> => {
  await api.post('/notifications/read');
};

export const remove = async (id: number): Promise<void> => {
  await api.delete(`/notifications/${id}`);
};
