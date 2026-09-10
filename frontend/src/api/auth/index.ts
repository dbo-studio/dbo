import { api } from '@/core/api';
import type { AuthStatusType } from './types';

const endpoint = {
  status: (): string => '/auth/status',
  login: (): string => '/auth/login',
  password: (): string => '/auth/password',
  logout: (): string => '/auth/logout'
};

export const getStatus = async (): Promise<AuthStatusType> => {
  return (await api.get<{ data: AuthStatusType }>(endpoint.status())).data.data;
};

export const login = async (email: string, password: string): Promise<void> => {
  await api.post(endpoint.login(), { email, password });
};

export const changePassword = async (currentPassword: string, password: string, confirm: string): Promise<void> => {
  await api.post(endpoint.password(), { currentPassword, password, confirm });
};

export const logout = async (): Promise<void> => {
  await api.post(endpoint.logout());
};
