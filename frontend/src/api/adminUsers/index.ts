import { api } from '@/core/api';
import type { UserPermissions } from '@/api/auth/types';
import type { AdminUserType } from './types';

export type { AdminUserType } from './types';

const endpoint = {
  list: (): string => '/admin/users',
  create: (): string => '/admin/users',
  update: (id: string): string => `/admin/users/${id}`
};

export const listUsers = async (): Promise<AdminUserType[]> => {
  return (await api.get<{ data: AdminUserType[] }>(endpoint.list())).data.data;
};

export const createUser = async (payload: {
  email: string;
  password: string;
  role: string;
  permissions?: UserPermissions;
}): Promise<AdminUserType> => {
  return (await api.post<{ data: AdminUserType }>(endpoint.create(), payload)).data.data;
};

export const updateUser = async (
  id: string,
  payload: {
    role?: string;
    permissions?: UserPermissions;
    disabled?: boolean;
    password?: string;
    totpDisabled?: boolean;
  }
): Promise<AdminUserType> => {
  return (await api.patch<{ data: AdminUserType }>(endpoint.update(id), payload)).data.data;
};
